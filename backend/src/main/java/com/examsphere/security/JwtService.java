package com.examsphere.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    public JwtService(@Value("${app.jwt.secret}") String secret) {
        if (secret == null || secret.length() < 32) throw new IllegalStateException("APP_JWT_SECRET must contain at least 32 characters");
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    public String generate(String email, String role) {
        return Jwts.builder().subject(email).claim("role", role).issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 1000L * 60 * 60 * 12)).signWith(key).compact();
    }
    public String subject(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject(); }
    public String role(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().get("role", String.class); }
}
