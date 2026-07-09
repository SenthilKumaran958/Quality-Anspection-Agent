package com.qualityinspection.service;

import com.qualityinspection.dto.ApiDtos.*;
import com.qualityinspection.model.User;
import com.qualityinspection.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin service — user management + aggregated statistics + defect trends.
 * All endpoints require ADMIN role (enforced at controller level).
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository       userRepository;
    private final InspectionRepository inspectionRepository;
    private final DefectRepository     defectRepository;
    private final ReportRepository     reportRepository;
    private final PasswordEncoder      passwordEncoder;

    /** Admin statistics overview. */
    public AdminStats getAdminStats() {
        long totalUsers      = userRepository.count();
        long totalInspections = inspectionRepository.count();
        long totalDefective  = inspectionRepository.countByStatus(com.qualityinspection.model.Inspection.Status.DEFECTIVE);
        long totalReports    = reportRepository.count();

        // Defect trends
        List<DefectTrend> trends = defectRepository.defectTypeCounts().stream()
                .limit(10)
                .map(row -> DefectTrend.builder()
                        .defectType((String) row[0])
                        .count(((Number) row[1]).longValue())
                        .build())
                .collect(Collectors.toList());

        // Daily inspections (last 30 days)
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<DailyInspection> daily = inspectionRepository.dailyStats(since).stream()
                .map(row -> DailyInspection.builder()
                        .date(row[0].toString())
                        .total(((Number) row[1]).longValue())
                        .defective(((Number) row[2]).longValue())
                        .build())
                .collect(Collectors.toList());

        return AdminStats.builder()
                .totalUsers(totalUsers)
                .totalInspections(totalInspections)
                .totalDefective(totalDefective)
                .totalReports(totalReports)
                .defectTrends(trends)
                .dailyInspections(daily)
                .build();
    }

    /** List all users with their inspection counts. */
    public List<UserDto> listUsers() {
        return userRepository.findAll().stream()
                .map(u -> UserDto.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .email(u.getEmail())
                        .fullName(u.getFullName())
                        .role(u.getRole().name())
                        .isActive(u.getIsActive())
                        .createdAt(u.getCreatedAt().toString())
                        .totalInspections(u.getInspections() != null ? u.getInspections().size() : 0)
                        .build())
                .collect(Collectors.toList());
    }

    /** Toggle active status of a user. */
    @Transactional
    public UserDto toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));
        user.setIsActive(!user.getIsActive());
        userRepository.save(user);
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .isActive(user.getIsActive())
                .build();
    }

    /** Delete a user. */
    @Transactional
    public void deleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new NoSuchElementException("User not found: " + userId);
        }
        userRepository.deleteById(userId);
    }
}
