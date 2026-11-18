package com.examsphere.repository;
import com.examsphere.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SubjectRepository extends JpaRepository<Subject,Long>{}
