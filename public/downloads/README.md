## APK Download Instructions

### Donde colocar el APK

Para que la descarga del APK funcione, coloca el archivo `walksafe.apk` en esta carpeta (`public/downloads/`).

### Pasos:

1. **Genera tu APK** desde Android Studio o usando comandos de Gradle:
   ```bash
   ./gradlew build --build-type release
   ```

2. **Coloca el APK aquí**: 
   - Carpeta: `public/downloads/walksafe.apk`

3. **El usuario verá el banner en el login móvil** y podrá descargar el APK directamente.

### Notas:

- El archivo será servido desde `https://tudominio.com/downloads/walksafe.apk`
- El navegador iniciará la descarga automáticamente.
- iOS requiere distribución a través de App Store (no se puede distribuir APK).
- Para pruebas locales, el APK estará disponible en `http://localhost:4200/downloads/walksafe.apk`

### Alternativa: Usar Cloud Storage

Si prefieres alojar el APK en la nube (Firebase Storage, AWS S3, etc.), cambia la URL en `login.ts`:

```typescript
link.href = 'https://tu-bucket.s3.amazonaws.com/walksafe.apk';
```

O con Firebase:
```typescript
link.href = 'https://storage.googleapis.com/tu-bucket/walksafe.apk';
```
