package com.examsphere.repository;
import com.examsphere.entity.Exam;
import com.examsphere.entity.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ExamRepository extends JpaRepository<Exam,Long>{ List<Exam> findByStatus(ExamStatus status); }
