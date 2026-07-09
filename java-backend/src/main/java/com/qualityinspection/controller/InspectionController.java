package com.qualityinspection.controller;

import com.qualityinspection.dto.ApiDtos.*;
import com.qualityinspection.service.InspectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for inspection operations.
 * Receives image metadata forwarded from Node.js after Multer upload.
 */
@RestController
@RequestMapping("/inspections")
@RequiredArgsConstructor
public class InspectionController {

    private final InspectionService inspectionService;

    /**
     * POST /inspections/analyze
     * Creates a new inspection.
     * Body: { imagePath, imageFilename, productCode }
     */
    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<InspectionDetail>> analyze(
            @RequestBody Map<String, String> body,
            Authentication auth) {

        String imagePath     = body.get("imagePath");
        String imageFilename = body.get("imageFilename");
        String productCode   = body.getOrDefault("productCode", "PRD-001");

        InspectionDetail detail = inspectionService.createInspection(
                imagePath, imageFilename, productCode, auth.getName());

        return ResponseEntity.ok(ApiResponse.ok("Inspection completed", detail));
    }

    /**
     * GET /inspections/history
     * Returns paginated, filtered inspection history.
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Page<InspectionSummary>>> history(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<InspectionSummary> result = inspectionService.getHistory(status, from, to, search, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * GET /inspections/{id}
     * Returns full inspection detail including defects.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InspectionDetail>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(inspectionService.getById(id)));
    }

    /**
     * DELETE /inspections/{id}
     * Deletes an inspection and all its associated defects.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        inspectionService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Inspection deleted", null));
    }
}
