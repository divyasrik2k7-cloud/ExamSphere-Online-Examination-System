
package com.examsphere.controller;

import com.examsphere.entity.Role;
import com.examsphere.entity.User;
import com.examsphere.repository.UserRepository;
import com.examsphere.security.JwtService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://localhost:4173"
})
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final String bootstrapKey;

    public AuthController(
            UserRepository users,
            PasswordEncoder encoder,
            JwtService jwt,
            @Value("${app.bootstrap.key:}") String bootstrapKey) {

        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.bootstrapKey = bootstrapKey;
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String name,
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, max = 72) String password
    ) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record StaffRequest(
            @NotBlank String name,
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank String role,
            @NotBlank String bootstrapKey
    ) {}

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(
            @Valid @RequestBody RegisterRequest body) {

        String email = body.email().trim().toLowerCase();

        if (users.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists"
            );
        }

        User user = new User();
        user.setName(body.name().trim());
        user.setEmail(email);
        user.setPasswordHash(encoder.encode(body.password()));
        user.setRole(Role.STUDENT);
        user.setActive(true);

        users.save(user);

        return session(user);
    }

    @PostMapping("/register-staff")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> registerStaff(
            @Valid @RequestBody StaffRequest body) {

        if (bootstrapKey.isBlank()
                || !MessageDigest.isEqual(
                    bootstrapKey.getBytes(StandardCharsets.UTF_8),
                    body.bootstrapKey().getBytes(StandardCharsets.UTF_8))) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Staff registration is disabled or the setup key is invalid"
            );
        }

        String email = body.email().trim().toLowerCase();

        if (users.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists"
            );
        }

        Role role;

        try {
            role = Role.valueOf(body.role().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Role must be ADMIN or TEACHER"
            );
        }

        if (role == Role.STUDENT) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Use public student registration for student accounts"
            );
        }

        User user = new User();
        user.setName(body.name().trim());
        user.setEmail(email);
        user.setPasswordHash(encoder.encode(body.password()));
        user.setRole(role);
        user.setActive(true);

        users.save(user);

        return session(user);
    }

    @PostMapping("/login")
    public Map<String, Object> login(
            @Valid @RequestBody LoginRequest body) {

        User user = users.findByEmail(
                body.email().trim().toLowerCase()
        ).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
        ));

        if (!user.isActive()
                || !encoder.matches(
                    body.password(),
                    user.getPasswordHash())) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        return session(user);
    }

    @GetMapping("/me")
    public Map<String, Object> me(
            org.springframework.security.core.Authentication authentication) {

        User user = users.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED
                ));

        return Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole().name()
        );
    }

    private Map<String, Object> session(User user) {

        return Map.of(
                "token", jwt.generate(
                        user.getEmail(),
                        user.getRole().name()
                ),
                "user", Map.of(
                        "id", user.getId(),
                        "name", user.getName(),
                        "email", user.getEmail(),
                        "role", user.getRole().name()
                )
        );
    }
}
