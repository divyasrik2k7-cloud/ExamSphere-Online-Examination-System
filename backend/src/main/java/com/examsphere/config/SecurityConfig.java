package com.examsphere.config;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.http.SessionCreationPolicy;
@Configuration
public class SecurityConfig {
 @Bean SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
   http.csrf(csrf->csrf.disable())
       .cors(cors->{})
       .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
       .authorizeHttpRequests(a->a.requestMatchers("/api/health","/api/subjects/**","/api/questions/**","/api/exams/**").permitAll().anyRequest().permitAll());
   return http.build();
 }
}
