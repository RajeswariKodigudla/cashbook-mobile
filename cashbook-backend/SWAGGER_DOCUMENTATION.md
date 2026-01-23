# Swagger/OpenAPI Documentation

## ✅ **IMPLEMENTED**

Swagger/OpenAPI documentation has been added to the Cashbook backend API using `drf-yasg`.

---

## 🌐 **LOCAL URLs**

Once the Django server is running (`python manage.py runserver`), you can access:

### **1. Swagger UI (Interactive)**
```
http://localhost:8000/swagger/
```
- Interactive API documentation
- Test endpoints directly from the browser
- See request/response schemas
- Authenticate with JWT tokens

### **2. ReDoc (Alternative UI)**
```
http://localhost:8000/redoc/
```
- Clean, readable API documentation
- Better for reading and understanding the API
- No interactive testing

### **3. OpenAPI Schema (JSON)**
```
http://localhost:8000/swagger.json
```
- Raw OpenAPI 3.0 schema in JSON format
- Can be imported into Postman, Insomnia, etc.

### **4. OpenAPI Schema (YAML)**
```
http://localhost:8000/swagger.yaml
```
- Raw OpenAPI 3.0 schema in YAML format

---

## 🔐 **AUTHENTICATION IN SWAGGER**

1. **Register a user** at `/api/register/`
2. **Login** at `/api/token/` to get access and refresh tokens
3. **Click "Authorize"** button in Swagger UI
4. **Enter**: `Bearer <your_access_token>`
5. **Click "Authorize"** to authenticate
6. Now you can test protected endpoints!

---

## 📋 **FEATURES**

- ✅ **All endpoints documented** (register, login, transactions, etc.)
- ✅ **JWT authentication** configured
- ✅ **Request/Response schemas** automatically generated
- ✅ **Interactive testing** in Swagger UI
- ✅ **Tags** for better organization (Authentication, Transactions)
- ✅ **Descriptions** for each endpoint

---

## 🚀 **QUICK START**

1. **Start Django server:**
   ```bash
   python manage.py runserver
   ```

2. **Open browser:**
   ```
   http://localhost:8000/swagger/
   ```

3. **Test the API:**
   - Register a new user
   - Login to get tokens
   - Authorize with Bearer token
   - Test transaction endpoints

---

## 📦 **INSTALLATION**

The package `drf-yasg==1.21.7` has been added to `requirements.txt` and installed.

---

**Enjoy testing your API with Swagger! 🎉**

