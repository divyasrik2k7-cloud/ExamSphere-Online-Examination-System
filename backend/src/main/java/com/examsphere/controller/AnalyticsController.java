package com.examsphere.controller;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/analytics") @CrossOrigin(origins="http://localhost:5173")
public class AnalyticsController {
 @GetMapping("/student/{id}") public Map<String,Object> student(@PathVariable Long id){
   return Map.of("studentId",id,"averageScore",82,"accuracy",87,"attempts",12,"rank",14);
 }
 @GetMapping("/admin") public Map<String,Object> admin(){
   return Map.of("students",428,"teachers",24,"exams",18,"published",6);
 }
}
