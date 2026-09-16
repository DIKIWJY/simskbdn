package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Role — 4 aktor dalam sistem SKBDN Pusri
// buyer  : Pembeli — upload Draft & Final SKBDN
// ap2    : Verifikasi Draft/Final sebelum diteruskan ke Keuangan (sesuai flow diagram)
// finance: Keuangan — review, setujui/revisi/tolak, lalu Admin yang mencairkan
// admin  : Administrator — kelola pengguna & sistem, serta eksekusi pencairan SKBDN
//          (peran ini berada di luar flow diagram SKBDN, murni untuk operasional sistem)
type Role string

const (
	RoleBuyer   Role = "buyer"
	RoleFinance Role = "finance"
	RoleAdmin   Role = "admin"
	RoleAP2     Role = "ap2" // Verifikasi dokumen sebelum ke Finance
)

type User struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Email       string         `gorm:"uniqueIndex;not null" json:"email"`
	Password    string         `gorm:"not null" json:"-"`
	Role        Role           `gorm:"not null;default:'buyer'" json:"role"`
	CompanyName string         `json:"company_name"`
	PhoneNumber string         `json:"phone_number"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserResponse — data user yang aman dikirim ke frontend (tanpa password)
type UserResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	Role        Role      `json:"role"`
	CompanyName string    `json:"company_name"`
	PhoneNumber string    `json:"phone_number"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:          u.ID,
		Name:        u.Name,
		Email:       u.Email,
		Role:        u.Role,
		CompanyName: u.CompanyName,
		PhoneNumber: u.PhoneNumber,
		IsActive:    u.IsActive,
		CreatedAt:   u.CreatedAt,
	}
}
