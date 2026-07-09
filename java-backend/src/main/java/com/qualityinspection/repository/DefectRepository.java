package com.qualityinspection.repository;

import com.qualityinspection.model.Defect;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for Defect entity.
 */
@Repository
public interface DefectRepository extends JpaRepository<Defect, Long> {

    List<Defect> findByInspectionId(Long inspectionId);

    /**
     * Aggregate defect counts by type — used for admin trend charts.
     */
    @Query("SELECT d.defectType, COUNT(d) FROM Defect d GROUP BY d.defectType ORDER BY COUNT(d) DESC")
    List<Object[]> defectTypeCounts();
}
