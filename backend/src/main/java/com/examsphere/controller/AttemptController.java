package com.examsphere.controller;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/attempts") @CrossOrigin(origins="http://localhost:5173")
public class AttemptController {
 @PostMapping public Map<String,Object> start(@RequestBody Map<String,Object> body){return Map.of("attemptId",1001,"status","IN_PROGRESS");}
 @PostMapping("/{id}/answers") public Map<String,String> answer(@PathVariable Long id,@RequestBody Map<String,Object> body){return Map.of("status","saved");}
 @PostMapping("/{id}/submit") public Map<String,Object> submit(@PathVariable Long id){return Map.of("attemptId",id,"status","SUBMITTED","score",82);}
 @GetMapping("/{id}/result") public Map<String,Object> result(@PathVariable Long id){return Map.of("attemptId",id,"score",82,"correct",33,"incorrect",7,"unanswered",0);}
}
