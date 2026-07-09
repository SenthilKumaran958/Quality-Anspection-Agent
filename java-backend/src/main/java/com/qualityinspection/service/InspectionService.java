package com.qualityinspection.service;

import com.qualityinspection.dto.ApiDtos.*;
import com.qualityinspection.model.*;
import com.qualityinspection.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Core business logic for product inspections.
 *
 * Workflow:
 *   1. Receive image path + product code from Node.js
 *   2. Call AI service for prediction
 *   3. Persist Inspection + Defects to MySQL
 *   4. Return full InspectionDetail DTO
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InspectionService {

    private final InspectionRepository inspectionRepository;
    private final ProductRepository    productRepository;
    private final UserRepository       userRepository;
    private final DefectRepository     defectRepository;
    private final AiService            aiService;
    private final DashboardService     dashboardService;

    private static final DateTimeFormatter CODE_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /**
     * Creates a new inspection by:
     *  - Looking up the product
     *  - Calling the AI service
     *  - Persisting inspection + defects
     *
     * @param imagePath     server path where image was stored
     * @param imageFilename original filename
     * @param productCode   product code from the upload form
     * @param username      authenticated user's username
     */
    @Transactional
    public InspectionDetail createInspection(String imagePath,
                                              String imageFilename,
                                              String productCode,
                                              String username) {
        // Resolve product
        Product product = productRepository.findAll().stream()
                .filter(p -> p.getProductCode().equalsIgnoreCase(productCode))
                .findFirst()
                .orElseGet(() -> productRepository.findAll().get(0)); // fallback to first

        // Resolve user
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        // Call AI service
        AiPredictionResponse prediction = aiService.predict(imagePath, productCode);

        // Build unique inspection code
        String code = "INS-" + LocalDateTime.now().format(CODE_FMT);

        // Build and save inspection
        Inspection inspection = Inspection.builder()
                .inspectionCode(code)
                .product(product)
                .user(user)
                .imagePath(imagePath)
                .imageFilename(imageFilename)
                .status(Inspection.Status.valueOf(prediction.getStatus()))
                .confidence(BigDecimal.valueOf(prediction.getConfidence()))
                .recommendation(Inspection.Recommendation.valueOf(prediction.getRecommendation()))
                .notes(buildNotes(prediction))
                .build();

        inspection = inspectionRepository.save(inspection);

        // Persist defects
        List<Defect> defects = new ArrayList<>();
        if (prediction.getDefects() != null) {
            for (AiDefect aiDef : prediction.getDefects()) {
                Defect d = Defect.builder()
                        .inspection(inspection)
                        .defectType(aiDef.getDefectType())
                        .severity(Defect.Severity.valueOf(aiDef.getSeverity()))
                        .confidence(BigDecimal.valueOf(aiDef.getConfidence()))
                        .bboxX(aiDef.getBboxX())
                        .bboxY(aiDef.getBboxY())
                        .bboxWidth(aiDef.getBboxWidth())
                        .bboxHeight(aiDef.getBboxHeight())
                        .description(aiDef.getDescription())
                        .build();
                defects.add(defectRepository.save(d));
            }
        }
        inspection.setDefects(defects);

        log.info("Inspection created: code={}, status={}, confidence={}",
                code, prediction.getStatus(), prediction.getConfidence());

        return toDetail(inspection);
    }

    /** Paginated, filtered inspection history. */
    public Page<InspectionSummary> getHistory(String statusStr,
                                               String fromStr,
                                               String toStr,
                                               String search,
                                               int page,
                                               int size) {
        Inspection.Status status = null;
        if (statusStr != null && !statusStr.isBlank()) {
            status = Inspection.Status.valueOf(statusStr.toUpperCase());
        }

        LocalDateTime from = fromStr != null && !fromStr.isBlank()
                ? LocalDateTime.parse(fromStr + "T00:00:00") : null;
        LocalDateTime to = toStr != null && !toStr.isBlank()
                ? LocalDateTime.parse(toStr + "T23:59:59") : null;

        Pageable pageable = PageRequest.of(page, size, Sort.by("inspectedAt").descending());
        Page<Inspection> raw = inspectionRepository.findFiltered(status, from, to, search, pageable);
        return raw.map(dashboardService::toSummary);
    }

    /** Get full inspection detail by ID. */
    public InspectionDetail getById(Long id) {
        Inspection i = inspectionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Inspection not found: " + id));
        return toDetail(i);
    }

    /** Delete inspection (and its defects via CASCADE). */
    @Transactional
    public void delete(Long id) {
        if (!inspectionRepository.existsById(id)) {
            throw new NoSuchElementException("Inspection not found: " + id);
        }
        inspectionRepository.deleteById(id);
    }

    // ---- Mappers ----

    private InspectionDetail toDetail(Inspection i) {
        List<DefectDto> defectDtos = (i.getDefects() != null)
                ? i.getDefects().stream().map(this::toDefectDto).collect(Collectors.toList())
                : Collections.emptyList();

        return InspectionDetail.builder()
                .id(i.getId())
                .inspectionCode(i.getInspectionCode())
                .productName(i.getProduct().getProductName())
                .productCode(i.getProduct().getProductCode())
                .status(i.getStatus().name())
                .confidence(i.getConfidence())
                .recommendation(i.getRecommendation() != null ? i.getRecommendation().name() : null)
                .notes(i.getNotes())
                .imageFilename(i.getImageFilename())
                .inspectedAt(i.getInspectedAt().toString())
                .inspectedBy(i.getUser().getFullName())
                .defects(defectDtos)
                .build();
    }

    private DefectDto toDefectDto(Defect d) {
        return DefectDto.builder()
                .id(d.getId())
                .defectType(d.getDefectType())
                .severity(d.getSeverity().name())
                .confidence(d.getConfidence())
                .bboxX(d.getBboxX())
                .bboxY(d.getBboxY())
                .bboxWidth(d.getBboxWidth())
                .bboxHeight(d.getBboxHeight())
                .description(d.getDescription())
                .build();
    }

    private String buildNotes(AiPredictionResponse prediction) {
        if (prediction.getDefects() == null || prediction.getDefects().isEmpty()) {
            return "No defects detected. Product meets quality standards.";
        }
        return prediction.getDefects().stream()
                .map(d -> d.getDefectType() + " (" + d.getSeverity() + "): " + d.getDescription())
                .collect(Collectors.joining("; "));
    }
}
