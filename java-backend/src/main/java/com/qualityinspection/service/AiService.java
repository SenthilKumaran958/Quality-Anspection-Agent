package com.qualityinspection.service;

import com.qualityinspection.dto.ApiDtos.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * AI Integration Service.
 *
 * Sends the image to the mock AI inference server (port 5000)
 * and maps the response to AiPredictionResponse DTO.
 *
 * If the AI service is unavailable, a deterministic fallback response
 * is generated based on the image filename to allow offline development.
 */
@Slf4j
@Service
public class AiService {

    @Value("${app.ai.service-url}")
    private String aiServiceUrl;

    @Value("${app.ai.predict-endpoint}")
    private String predictEndpoint;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Calls the AI prediction endpoint with the uploaded image path.
     *
     * @param imagePath  server-relative path to the saved image file
     * @param productCode product code for context
     * @return AiPredictionResponse with status, confidence, defects and bounding boxes
     */
    public AiPredictionResponse predict(String imagePath, String productCode) {
        try {
            String url = aiServiceUrl + predictEndpoint;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = Map.of(
                    "imagePath",   imagePath,
                    "productCode", productCode
            );

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<AiPredictionResponse> response =
                    restTemplate.postForEntity(url, request, AiPredictionResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("AI prediction succeeded: status={}", response.getBody().getStatus());
                return response.getBody();
            }
        } catch (Exception e) {
            log.warn("AI service unavailable ({}), using fallback response", e.getMessage());
        }

        // Fallback: deterministic mock based on hash of imagePath
        return generateFallbackResponse(imagePath);
    }

    /**
     * Generates a realistic fallback response when the AI service is down.
     * Uses the image path hash to alternate between GOOD and DEFECTIVE results.
     */
    private AiPredictionResponse generateFallbackResponse(String imagePath) {
        int hash = Math.abs(imagePath.hashCode());
        boolean isDefective = (hash % 3 != 0); // ~67% defective for demo variety

        if (!isDefective) {
            return AiPredictionResponse.builder()
                    .status("GOOD")
                    .confidence(95.0 + (hash % 500) / 100.0)
                    .recommendation("ACCEPT")
                    .defects(Collections.emptyList())
                    .build();
        }

        // Pick a defect from predefined list
        String[][] defectPool = {
            {"Scratch", "LOW",      "Surface scratch detected on product body"},
            {"Crack",   "CRITICAL", "Micro-crack detected on product surface"},
            {"Dent",    "MEDIUM",   "Mechanical dent found on outer casing"},
            {"Corrosion","HIGH",    "Oxidation/corrosion visible on metallic surface"},
            {"Warp",    "MEDIUM",   "Dimensional warping exceeds tolerance"},
            {"Stain",   "LOW",      "Contamination stain on product surface"},
        };

        String[] defect = defectPool[hash % defectPool.length];
        double conf = 80.0 + (hash % 1500) / 100.0;

        AiDefect aiDefect = AiDefect.builder()
                .defectType(defect[0])
                .severity(defect[1])
                .confidence(conf)
                .bboxX(50 + (hash % 200))
                .bboxY(50 + (hash % 150))
                .bboxWidth(60 + (hash % 100))
                .bboxHeight(40 + (hash % 80))
                .description(defect[2])
                .build();

        String recommendation = defect[1].equals("LOW") ? "REWORK" : "REJECT";

        return AiPredictionResponse.builder()
                .status("DEFECTIVE")
                .confidence(conf)
                .recommendation(recommendation)
                .defects(List.of(aiDefect))
                .build();
    }
}
