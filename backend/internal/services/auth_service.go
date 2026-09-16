package services

import (
	"errors"
	"time"

	"pusri-backend/internal/config"
	"pusri-backend/internal/models"
	"pusri-backend/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// bcryptCost = 12 → lebih tahan brute-force dari DefaultCost(10).
// Cost 12 ~400ms/operasi — tidak terasa user normal, sangat memperlambat attacker.
const bcryptCost = 12

// ─── DTOs ────────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Name        string      `json:"name"         binding:"required,min=2,max=100"`
	Email       string      `json:"email"        binding:"required,email,max=255"`
	Password    string      `json:"password"     binding:"required,min=8,max=128"`
	Role        models.Role `json:"role"         binding:"required,oneof=buyer ap2 finance admin"`
	CompanyName string      `json:"company_name" binding:"max=200"`
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,max=128"`
}

// UpdateProfileRequest — user update profil sendiri.
// Dipindah dari handler ke sini agar validasi dan logika ada di satu tempat.
type UpdateProfileRequest struct {
	Name        string `json:"name"         binding:"max=100"`
	Email       string `json:"email"        binding:"omitempty,email,max=255"`
	CompanyName string `json:"company_name" binding:"max=200"`
	PhoneNumber string `json:"phone_number" binding:"max=20"`
}

// ChangePasswordRequest — user ganti password sendiri.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password"     binding:"required,min=8,max=128"`
}

type TokenPair struct {
	AccessToken  string              `json:"access_token"`
	RefreshToken string              `json:"refresh_token"`
	User         models.UserResponse `json:"user"`
}

// JWTClaims — payload JWT.
type JWTClaims struct {
	UserID string      `json:"user_id"`
	Email  string      `json:"email"`
	Role   models.Role `json:"role"`
	jwt.RegisteredClaims
}

// ─── authService ──────────────────────────────────────────────────────────────

// authService menerima interface repository dan config — bukan concrete type.
// Ini memungkinkan unit testing dengan mock tanpa database.
type authService struct {
	userRepo repository.UserRepository
	cfg      *config.AppConfig
}

// NewAuthService mengembalikan AuthServiceInterface, bukan concrete type.
// Caller tidak perlu tahu tentang struct konkret authService.
func NewAuthService(userRepo repository.UserRepository, cfg *config.AppConfig) AuthServiceInterface {
	return &authService{userRepo: userRepo, cfg: cfg}
}

func (s *authService) Register(req RegisterRequest) (*models.UserResponse, error) {
	existing, _ := s.userRepo.FindByEmail(req.Email)
	if existing != nil {
		return nil, errors.New("email sudah terdaftar")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return nil, errors.New("gagal memproses password")
	}
	user := &models.User{
		Name:        req.Name,
		Email:       req.Email,
		Password:    string(hashed),
		Role:        req.Role,
		CompanyName: req.CompanyName,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, errors.New("gagal membuat akun")
	}
	resp := user.ToResponse()
	return &resp, nil
}

func (s *authService) Login(req LoginRequest) (*TokenPair, error) {
	user, err := s.userRepo.FindByEmail(req.Email)
	// Pesan generik — cegah user enumeration attack (attacker tidak bisa tahu
	// apakah email terdaftar atau tidak dari respons error).
	if err != nil || user == nil {
		return nil, errors.New("email atau password salah")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("email atau password salah")
	}
	if !user.IsActive {
		return nil, errors.New("akun tidak aktif, hubungi administrator")
	}
	return s.issueTokenPair(user)
}

func (s *authService) RefreshToken(refreshToken string) (*TokenPair, error) {
	claims, err := s.validateToken(refreshToken)
	if err != nil {
		return nil, errors.New("refresh token tidak valid")
	}
	user, err := s.userRepo.FindByID(claims.UserID)
	if err != nil || user == nil {
		return nil, errors.New("user tidak ditemukan")
	}
	if !user.IsActive {
		return nil, errors.New("akun tidak aktif")
	}
	return s.issueTokenPair(user)
}

// UpdateProfile — business logic pindah dari handler ke sini.
// Handler seharusnya hanya: parse request → panggil service → kembalikan response.
func (s *authService) UpdateProfile(userID string, req UpdateProfileRequest) (*models.UserResponse, error) {
	// Validasi email unik SEBELUM update — cegah DB constraint error yang tidak informatif.
	if req.Email != "" {
		taken, err := s.userRepo.IsEmailTaken(req.Email, userID)
		if err != nil {
			return nil, errors.New("gagal memeriksa ketersediaan email")
		}
		if taken {
			return nil, errors.New("email sudah digunakan oleh akun lain")
		}
	}

	updates := map[string]interface{}{
		"company_name": req.CompanyName,
		"phone_number": req.PhoneNumber,
	}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}

	if err := s.userRepo.Update(userID, updates); err != nil {
		return nil, errors.New("gagal memperbarui profil")
	}

	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("gagal memuat data profil terbaru")
	}
	resp := user.ToResponse()
	return &resp, nil
}

// ChangePassword — business logic pindah dari handler ke sini.
func (s *authService) ChangePassword(userID string, req ChangePasswordRequest) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return errors.New("user tidak ditemukan")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		return errors.New("password saat ini salah")
	}
	if req.CurrentPassword == req.NewPassword {
		return errors.New("password baru harus berbeda dari password saat ini")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcryptCost)
	if err != nil {
		return errors.New("gagal memproses password baru")
	}
	return s.userRepo.Update(userID, map[string]interface{}{"password": string(hashed)})
}

// AdminResetPassword — Admin mereset password user lain secara paksa
// (tanpa perlu tahu password lama, beda dengan ChangePassword milik user
// sendiri). Dipanggil dari admin_handler.go saat field "password" diisi
// pada form edit user.
func (s *authService) AdminResetPassword(userID, newPassword string) error {
	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return errors.New("gagal memproses password baru")
	}
	return s.userRepo.Update(userID, map[string]interface{}{"password": string(hashed)})
}

// ─── Token helpers ────────────────────────────────────────────────────────────

func (s *authService) issueTokenPair(user *models.User) (*TokenPair, error) {
	accessToken, err := s.generateToken(user, s.cfg.JWTAccessExpire)
	if err != nil {
		return nil, errors.New("gagal membuat access token")
	}
	refreshToken, err := s.generateToken(user, s.cfg.JWTRefreshExpire)
	if err != nil {
		return nil, errors.New("gagal membuat refresh token")
	}
	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user.ToResponse(),
	}, nil
}

func (s *authService) generateToken(user *models.User, duration time.Duration) (string, error) {
	claims := JWTClaims{
		UserID: user.ID.String(),
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "simskbdn-pusri",
			Subject:   user.ID.String(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *authService) validateToken(tokenStr string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("signing method tidak valid")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("token tidak valid atau kadaluarsa")
	}
	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return nil, errors.New("claims tidak valid")
	}
	return claims, nil
}

// ValidateToken adalah fungsi publik yang dipakai oleh middleware auth.
// Menggunakan config singleton — middleware dibuat setelah config diload.
func ValidateToken(tokenStr, jwtSecret string) (*JWTClaims, error) {
	if jwtSecret == "" {
		return nil, errors.New("JWT_SECRET tidak dikonfigurasi")
	}
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("signing method tidak valid")
		}
		return []byte(jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("token tidak valid atau kadaluarsa")
	}
	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return nil, errors.New("claims tidak valid")
	}
	return claims, nil
}
