package com.qualityinspection.controller;

import com.qualityinspection.dto.ApiDtos.*;
import com.qualityinspection.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for report generation and listing.
 */
@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /**
     * GET /reports
     * Lists all generated reports.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReportSummaryDto>>> listReports() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.listReports()));
    }

    /**
     * POST /reports/generate
     * Generates a PDF for the given inspection ID and returns it as a download.
     * Body: { inspectionId: 123 }
     */
    @PostMapping("/generate")
    public ResponseEntity<byte[]> generateReport(
            @RequestBody Map<String, Long> body,
            Authentication auth) throws Exception {

        Long inspectionId = body.get("inspectionId");
        byte[] pdf = reportService.generateReport(inspectionId, auth.getName());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.attachment().filename("inspection-report-" + inspectionId + ".pdf").build()
        );

        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
