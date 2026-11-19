package com.examsphere.controller;
import com.examsphere.entity.Subject;
import com.examsphere.repository.SubjectRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/subjects")
@CrossOrigin(origins={"http://localhost:5173", "http://localhost:4173"})
public class SubjectController {
 private final SubjectRepository repo;
 public SubjectController(SubjectRepository repo){this.repo=repo;}
 @GetMapping public List<Subject> all(){return repo.findAll();}
 @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
@PostMapping public Subject create(@RequestBody Subject s){return repo.save(s);}
}
