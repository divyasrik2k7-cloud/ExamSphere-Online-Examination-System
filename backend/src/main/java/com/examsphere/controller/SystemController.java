package com.examsphere.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemController {
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "ExamSphere API", "version", "2.0.0");
    }
}
