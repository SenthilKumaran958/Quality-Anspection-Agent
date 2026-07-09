package com.qualityinspection;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Quality Inspection Agent — Spring Boot application.
 * Bootstraps the entire Spring context including JPA, Security, and REST layers.
 */
@SpringBootApplication
public class QualityInspectionApplication {

    public static void main(String[] args) {
        SpringApplication.run(QualityInspectionApplication.class, args);
    }
}
