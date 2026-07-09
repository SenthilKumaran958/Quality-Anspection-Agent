package com.qualityinspection.repository;

import com.qualityinspection.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for Report entity.
 */
@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByOrderByGeneratedAtDesc();

    List<Report> findByInspectionId(Long inspectionId);
}
