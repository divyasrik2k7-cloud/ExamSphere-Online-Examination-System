package com.examsphere.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="subjects") @Getter @Setter @NoArgsConstructor
public class Subject {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 private String name;
 private String description;
}
