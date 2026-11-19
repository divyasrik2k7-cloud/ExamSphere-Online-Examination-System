package com.examsphere.controller;
import com.examsphere.entity.Question;
import com.examsphere.repository.QuestionRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/questions")
@CrossOrigin(origins={"http://localhost:5173", "http://localhost:4173"})
public class QuestionController {
 private final QuestionRepository repo;
 public QuestionController(QuestionRepository repo){this.repo=repo;}
 @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
 @GetMapping public List<Question> all(){return repo.findAll();}
 @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
 @GetMapping("/subject/{id}") public List<Question> bySubject(@PathVariable Long id){return repo.findBySubjectId(id);}
 @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
@PostMapping public Question create(@RequestBody Question q){return repo.save(q);}
}
