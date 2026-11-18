package com.examsphere.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="users") @Getter @Setter @NoArgsConstructor
public class User {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 private String name;
 @Column(unique=true, nullable=false) private String email;
 @Column(name="password_hash") private String passwordHash;
 @Enumerated(EnumType.STRING) private Role role;
 private boolean active=true;
}
