package com.qualityinspection.service;

import com.qualityinspection.dto.ApiDtos.*;
import com.qualityinspection.model.Inspection;
import com.qualityinspection.repository.InspectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Provides aggregated statistics for the dashboard page.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InspectionRepository inspectionRepository;

    /**
     * Builds dashboard stats: counts, accuracy, recent inspections.
     */
    public DashboardStats getStats() {
        long total     = inspectionRepository.count();
        long good      = inspectionRepository.countByStatus(Inspection.Status.GOOD);
        long defective = inspectionRepository.countByStatus(Inspection.Status.DEFECTIVE);

        Double avgConf = inspectionRepository.averageConfidence();
        double accuracy = (avgConf != null) ? avgConf : 0.0;

        List<InspectionSummary> recent = inspectionRepository.findTop10ByOrderByInspectedAtDesc()
                .stream()
                .map(this::toSummary)
                .collect(Collectors.toList());

        return DashboardStats.builder()
                .totalInspected(total)
                .goodProducts(good)
                .defectiveProducts(defective)
                .detectionAccuracy(Math.round(accuracy * 100.0) / 100.0)
                .recentInspections(recent)
                .build();
    }

    InspectionSummary toSummary(Inspection i) {
        return InspectionSummary.builder()
                .id(i.getId())
                .inspectionCode(i.getInspectionCode())
                .productName(i.getProduct().getProductName())
                .productCode(i.getProduct().getProductCode())
                .status(i.getStatus().name())
                .confidence(i.getConfidence())
                .recommendation(i.getRecommendation() != null ? i.getRecommendation().name() : null)
                .inspectedAt(i.getInspectedAt().toString())
                .inspectedBy(i.getUser().getFullName())
                .defectCount(i.getDefects() != null ? i.getDefects().size() : 0)
                .build();
    }
}
