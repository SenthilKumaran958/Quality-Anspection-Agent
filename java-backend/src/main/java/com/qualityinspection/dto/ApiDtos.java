package com.qualityinspection.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Transfer Objects used across REST layer.
 * Avoids exposing JPA entities directly.
 */
public class ApiDtos {

    // ---- Auth ----
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RegisterRequest {
        private String username;
        private String email;
        private String password;
        private String fullName;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private String username;
        private String fullName;
        private String email;
        private String role;
        private Long userId;
    }

    // ---- Dashboard ----
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DashboardStats {
        private long totalInspected;
        private long goodProducts;
        private long defectiveProducts;
        private double detectionAccuracy;
        private List<InspectionSummary> recentInspections;
    }

    // ---- Inspection ----
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class InspectionSummary {
        private Long id;
        private String inspectionCode;
        private String productName;
        private String productCode;
        private String status;
        private BigDecimal confidence;
        private String recommendation;
        private String inspectedAt;
        private String inspectedBy;
        private int defectCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class InspectionDetail {
        private Long id;
        private String inspectionCode;
        private String productName;
        private String productCode;
        private String status;
        private BigDecimal confidence;
        private String recommendation;
        private String notes;
        private String imageFilename;
        private String inspectedAt;
        private String inspectedBy;
        private List<DefectDto> defects;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DefectDto {
        private Long id;
        private String defectType;
        private String severity;
        private BigDecimal confidence;
        private Integer bboxX;
        private Integer bboxY;
        private Integer bboxWidth;
        private Integer bboxHeight;
        private String description;
    }

    // ---- AI Service ----
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiPredictionRequest {
        private String imageBase64;
        private String imagePath;
        private String productCode;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiPredictionResponse {
        private String status;          // GOOD / DEFECTIVE
        private double confidence;
        private String recommendation;
        private List<AiDefect> defects;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiDefect {
        private String defectType;
        private String severity;
        private double confidence;
        private int bboxX;
        private int bboxY;
        private int bboxWidth;
        private int bboxHeight;
        private String description;
    }

    // ---- Report ----
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReportSummaryDto {
        private Long id;
        private String reportCode;
        private String inspectionCode;
        private String productName;
        private String generatedBy;
        private Integer fileSizeKb;
        private String summary;
        private String generatedAt;
    }

    // ---- Admin ----
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserDto {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private Boolean isActive;
        private String createdAt;
        private long totalInspections;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AdminStats {
        private long totalUsers;
        private long totalInspections;
        private long totalDefective;
        private long totalReports;
        private List<DefectTrend> defectTrends;
        private List<DailyInspection> dailyInspections;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DefectTrend {
        private String defectType;
        private long count;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DailyInspection {
        private String date;
        private long total;
        private long defective;
    }

    // ---- Generic ----
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;

        public static <T> ApiResponse<T> ok(T data) {
            return ApiResponse.<T>builder().success(true).data(data).build();
        }

        public static <T> ApiResponse<T> ok(String message, T data) {
            return ApiResponse.<T>builder().success(true).message(message).data(data).build();
        }

        public static <T> ApiResponse<T> error(String message) {
            return ApiResponse.<T>builder().success(false).message(message).build();
        }
    }
}
