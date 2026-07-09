package com.qualityinspection.controller;

import com.qualityinspection.dto.ApiDtos.*;
import com.qualityinspection.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for admin panel operations.
 * All endpoints restricted to ADMIN role.
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    /** GET /admin/stats — aggregated admin statistics */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStats>> getAdminStats() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAdminStats()));
    }

    /** GET /admin/users — list all users */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDto>>> listUsers() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.listUsers()));
    }

    /** PUT /admin/users/{id}/toggle — enable/disable user */
    @PutMapping("/users/{id}/toggle")
    public ResponseEntity<ApiResponse<UserDto>> toggleUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("User status updated", adminService.toggleUserStatus(id)));
    }

    /** DELETE /admin/users/{id} — delete user */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok("User deleted", null));
    }
}
