package com.examsphere.controller;
import com.examsphere.entity.*;
import com.examsphere.repository.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/exams")
@CrossOrigin(origins="http://localhost:5173")
public class ExamController {
 private final ExamRepository repo;
 public ExamController(ExamRepository repo){this.repo=repo;}
 @GetMapping public List<Exam> all(){return repo.findAll();}
 @GetMapping("/published") public List<Exam> published(){return repo.findByStatus(ExamStatus.PUBLISHED);}
 @PostMapping public Exam create(@RequestBody Exam e){return repo.save(e);}
 @PatchMapping("/{id}/publish") public Exam publish(@PathVariable Long id){
   Exam e=repo.findById(id).orElseThrow(); e.setStatus(ExamStatus.PUBLISHED); return repo.save(e);
 }
}
