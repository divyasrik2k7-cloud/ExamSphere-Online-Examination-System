package com.examsphere.controller;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/auth") @CrossOrigin(origins="http://localhost:5173")
public class AuthController {
 @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,String> body){
   return Map.of("message","Authentication endpoint ready","email",body.getOrDefault("email",""),"token","DEMO_TOKEN","role","STUDENT");
 }
 @PostMapping("/register") public Map<String,String> register(@RequestBody Map<String,String> body){
   return Map.of("message","Registration endpoint ready");
 }
 @GetMapping("/me") public Map<String,String> me(){return Map.of("role","STUDENT","status","authenticated");}
}
