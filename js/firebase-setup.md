# Configuración de Firebase para Reina María IPS

## Paso 1 — Crear el proyecto en Firebase

1. Ve a https://console.firebase.google.com
2. Haz clic en **"Agregar proyecto"**
3. Nombre: `reina-maria-ips`
4. Desactiva Google Analytics (opcional)
5. Haz clic en **Crear proyecto**

## Paso 2 — Activar Authentication

1. En el menú lateral, ve a **Authentication → Comenzar**
2. En la pestaña **Sign-in method**, activa **Correo electrónico/contraseña**

## Paso 3 — Activar Firestore

1. En el menú lateral, ve a **Firestore Database → Crear base de datos**
2. Selecciona modo **Producción** (o prueba si es desarrollo)
3. Elige la región más cercana a Colombia: `us-central1`

## Paso 4 — Obtener la configuración

1. Ve a **Configuración del proyecto** (ícono de engranaje)
2. En la sección **Tus apps**, haz clic en **"</>" (Web)**
3. Nombre de la app: `reina-maria-ips-web`
4. Copia el objeto `firebaseConfig` que aparece

## Paso 5 — Pegar la configuración en los 3 archivos

Busca este bloque en **portal.html**, **dashboard-paciente.html** y **dashboard-empleado.html**:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

Y reemplázalo con el que copiaste de Firebase.

## Paso 6 — Reglas de seguridad de Firestore

En Firebase Console → Firestore → Reglas, pega esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Paso 7 — Código de empleados

En `portal.html`, busca esta línea y cambia el código secreto:

```javascript
const EMPLOYEE_CODE = "REINA2026"; // Cámbialo por uno seguro
```

## Listo

Con estos pasos el login, registro y los dashboards funcionarán completamente.
