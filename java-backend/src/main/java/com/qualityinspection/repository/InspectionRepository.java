package com.qualityinspection.repository;

import com.qualityinspection.model.Inspection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for Inspection entity.
 * Provides queries for dashboard statistics and filtered history views.
 */
@Repository
public interface InspectionRepository extends JpaRepository<Inspection, Long> {

    Optional<Inspection> findByInspectionCode(String inspectionCode);

    // -- Statistics queries --
    long countByStatus(Inspection.Status status);

    @Query("SELECT COUNT(i) FROM Inspection i WHERE i.status IN ('GOOD', 'DEFECTIVE')")
    long countCompleted();

    @Query("SELECT AVG(i.confidence) FROM Inspection i WHERE i.status IN ('GOOD','DEFECTIVE')")
    Double averageConfidence();

    // -- Recent inspections (for dashboard) --
    List<Inspection> findTop10ByOrderByInspectedAtDesc();

    // -- Filtered history --
    @Query("""
            SELECT i FROM Inspection i
            WHERE (:status IS NULL OR i.status = :status)
            AND (:from IS NULL OR i.inspectedAt >= :from)
            AND (:to IS NULL OR i.inspectedAt <= :to)
            AND (:search IS NULL OR
                 LOWER(i.inspectionCode) LIKE LOWER(CONCAT('%',:search,'%')) OR
                 LOWER(i.product.productName) LIKE LOWER(CONCAT('%',:search,'%')))
            ORDER BY i.inspectedAt DESC
            """)
    Page<Inspection> findFiltered(
            @Param("status") Inspection.Status status,
            @Param("from")   LocalDateTime from,
            @Param("to")     LocalDateTime to,
            @Param("search") String search,
            Pageable pageable
    );

    // -- Admin: inspections per day (last 30 days) --
    @Query("""
            SELECT DATE(i.inspectedAt) as day, COUNT(i) as total,
                   SUM(CASE WHEN i.status = 'DEFECTIVE' THEN 1 ELSE 0 END) as defective
            FROM Inspection i
            WHERE i.inspectedAt >= :since
            GROUP BY DATE(i.inspectedAt)
            ORDER BY DATE(i.inspectedAt)
            """)
    List<Object[]> dailyStats(@Param("since") LocalDateTime since);
}
