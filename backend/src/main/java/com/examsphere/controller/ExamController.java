package com.examsphere.controller;

import com.examsphere.entity.*;
import com.examsphere.repository.*;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/exams")
@CrossOrigin(origins={"http://localhost:5173", "http://localhost:4173"})
public class ExamController {
    private final ExamRepository exams;
    private final SubjectRepository subjects;
    private final UserRepository users;
    public ExamController(ExamRepository exams, SubjectRepository subjects, UserRepository users) {
        this.exams=exams; this.subjects=subjects; this.users=users;
    }

    public record QuestionInput(@NotBlank String text, @NotNull List<@NotBlank String> options,
                                @Min(0) @Max(3) int correct, @NotNull @DecimalMin("0.5") BigDecimal marks,
                                String explanation) {}
    public record ExamInput(@NotBlank String title, String description, @NotBlank String subject,
                            @Min(1) int durationMinutes, List<@Valid QuestionInput> questions) {}

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public List<Map<String,Object>> all(Authentication auth) {
        User current=currentUser(auth);
        List<Exam> list=current.getRole()==Role.ADMIN?exams.findAll():exams.findByCreatedByEmail(current.getEmail());
        return list.stream().map(e->toMap(e,true)).toList();
    }

    @GetMapping("/published")
    @PreAuthorize("hasRole('STUDENT')")
    public List<Map<String,Object>> published() {
        return exams.findByStatus(ExamStatus.PUBLISHED).stream().map(e->toMap(e,false)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Transactional
    public Map<String,Object> create(@Valid @RequestBody ExamInput input, Authentication auth) {
        if(input.questions()==null || input.questions().isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Add at least one question");
        User creator=currentUser(auth);
        Subject subject=subjects.findByNameIgnoreCase(input.subject().trim()).orElseGet(()->{Subject s=new Subject();s.setName(input.subject().trim());return subjects.save(s);});
        Exam exam=new Exam(); exam.setTitle(input.title().trim()); exam.setDescription(input.description()); exam.setSubject(subject);
        exam.setDurationMinutes(input.durationMinutes()); exam.setCreatedBy(creator); exam.setStatus(ExamStatus.DRAFT); exam.setMaxAttempts(1);
        List<Question> qs=new ArrayList<>(); BigDecimal total=BigDecimal.ZERO;
        for(QuestionInput q:input.questions()) {
            if(q.options()==null || q.options().size()!=4) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Each question must have four options");
            Question entity=new Question(); entity.setSubject(subject); entity.setQuestionText(q.text().trim());
            entity.setOptionA(q.options().get(0)); entity.setOptionB(q.options().get(1)); entity.setOptionC(q.options().get(2)); entity.setOptionD(q.options().get(3));
            entity.setCorrectOption(String.valueOf((char)('A'+q.correct()))); entity.setExplanation(q.explanation()); entity.setDifficulty("GENERAL"); entity.setMarks(q.marks()); entity.setNegativeMarks(BigDecimal.ZERO);
            qs.add(entity); total=total.add(q.marks());
        }
        exam.setQuestions(qs); exam.setTotalMarks(total);
        return toMap(exams.save(exam),true);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Transactional
    public Map<String,Object> update(@PathVariable Long id,@Valid @RequestBody ExamInput input,Authentication auth) {
        Exam exam=owned(id,auth); if(exam.getStatus()==ExamStatus.PUBLISHED) throw new ResponseStatusException(HttpStatus.CONFLICT,"Unpublish the test before editing");
        if(input.questions()==null||input.questions().isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Add at least one question");
        Subject subject=subjects.findByNameIgnoreCase(input.subject().trim()).orElseGet(()->{Subject s=new Subject();s.setName(input.subject().trim());return subjects.save(s);});
        exam.setTitle(input.title().trim());exam.setDescription(input.description());exam.setSubject(subject);exam.setDurationMinutes(input.durationMinutes());
        exam.getQuestions().clear(); BigDecimal total=BigDecimal.ZERO;
        for(QuestionInput q:input.questions()) { if(q.options()==null||q.options().size()!=4) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Each question must have four options"); Question x=new Question();x.setSubject(subject);x.setQuestionText(q.text().trim());x.setOptionA(q.options().get(0));x.setOptionB(q.options().get(1));x.setOptionC(q.options().get(2));x.setOptionD(q.options().get(3));x.setCorrectOption(String.valueOf((char)('A'+q.correct())));x.setExplanation(q.explanation());x.setDifficulty("GENERAL");x.setMarks(q.marks());x.setNegativeMarks(BigDecimal.ZERO);exam.getQuestions().add(x);total=total.add(q.marks()); }
        exam.setTotalMarks(total); return toMap(exams.save(exam),true);
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Transactional
    public Map<String,Object> publish(@PathVariable Long id,Authentication auth) {
        Exam e=owned(id,auth); if(e.getQuestions().isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"A test needs at least one question");
        e.setStatus(ExamStatus.PUBLISHED);return toMap(exams.save(e),true);
    }
    @PatchMapping("/{id}/unpublish")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    @Transactional
    public Map<String,Object> unpublish(@PathVariable Long id,Authentication auth) { Exam e=owned(id,auth);e.setStatus(ExamStatus.DRAFT);return toMap(exams.save(e),true); }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public void delete(@PathVariable Long id,Authentication auth) { exams.delete(owned(id,auth)); }

    private User currentUser(Authentication auth) { return users.findByEmail(auth.getName()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED)); }
    private Exam owned(Long id,Authentication auth) { Exam e=exams.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));User u=currentUser(auth);if(u.getRole()!=Role.ADMIN&&!e.getCreatedBy().getId().equals(u.getId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);return e; }
    private Map<String,Object> toMap(Exam e,boolean includeAnswers) {
        List<Map<String,Object>> qs=e.getQuestions().stream().map(q->{Map<String,Object> m=new LinkedHashMap<>();m.put("id",q.getId());m.put("text",q.getQuestionText());m.put("options",List.of(q.getOptionA(),q.getOptionB(),q.getOptionC(),q.getOptionD()));m.put("marks",q.getMarks());if(includeAnswers){m.put("correct",q.getCorrectOption().charAt(0)-'A');m.put("explanation",q.getExplanation());}return m;}).toList();
        Map<String,Object> out=new LinkedHashMap<>();out.put("id",e.getId());out.put("title",e.getTitle());out.put("description",e.getDescription());out.put("subject",e.getSubject().getName());out.put("durationMinutes",e.getDurationMinutes());out.put("totalMarks",e.getTotalMarks());out.put("status",e.getStatus().name());out.put("questions",qs);out.put("questionCount",qs.size());out.put("createdBy",e.getCreatedBy().getEmail());return out;
    }
}
