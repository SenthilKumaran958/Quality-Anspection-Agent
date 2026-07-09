package com.qualityinspection.controller;

import com.qualityinspection.dto.ApiDtos.*;
import com.qualityinspection.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for dashboard statistics.
 */
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * GET /dashboard/stats
     * Returns aggregated statistics for the dashboard page.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStats>> getStats(Authentication auth) {
        DashboardStats stats = dashboardService.getStats();
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
