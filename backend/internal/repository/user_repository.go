package repository

import (
	"pusri-backend/internal/models"

	"gorm.io/gorm"
)

// userRepo adalah implementasi konkret dari UserRepository interface.
// Menerima *gorm.DB via konstruktor (Dependency Injection) —
// tidak lagi memanggil database.GetDB() sendiri.
type userRepo struct {
	db *gorm.DB
}

// NewUserRepository mengembalikan UserRepository interface.
// Caller tidak perlu tahu tentang struct konkret userRepo.
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userRepo) FindByID(id string) (*models.User, error) {
	var user models.User
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ? AND deleted_at IS NULL", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByRole(role models.Role) ([]models.User, error) {
	var users []models.User
	err := r.db.
		Where("role = ? AND deleted_at IS NULL AND is_active = true", role).
		Order("created_at DESC").
		Find(&users).Error
	return users, err
}

// FindAllWithFilter — dipakai admin: daftar user dengan filter role & search.
func (r *userRepo) FindAllWithFilter(search, role string) ([]models.User, error) {
	var users []models.User
	query := r.db.Where("deleted_at IS NULL")
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where(
			"name ILIKE ? OR email ILIKE ? OR company_name ILIKE ?",
			pattern, pattern, pattern,
		)
	}
	err := query.Order("created_at DESC").Find(&users).Error
	return users, err
}

// FindBuyers — daftar semua buyer aktif (untuk dropdown admin upload-for-buyer).
func (r *userRepo) FindBuyers() ([]models.User, error) {
	var users []models.User
	err := r.db.
		Where("role = ? AND deleted_at IS NULL AND is_active = true", models.RoleBuyer).
		Order("name ASC").
		Find(&users).Error
	return users, err
}

func (r *userRepo) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Updates(updates).Error
}

func (r *userRepo) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&models.User{}).Error
}

func (r *userRepo) ToggleActive(id string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&user).Error; err != nil {
		return nil, err
	}
	newState := !user.IsActive
	if err := r.db.Model(&user).Update("is_active", newState).Error; err != nil {
		return nil, err
	}
	user.IsActive = newState
	return &user, nil
}

// IsEmailTaken memeriksa apakah email sudah dipakai user lain (untuk UpdateProfile).
// excludeID adalah ID user yang sedang melakukan perubahan (dikecualikan dari pengecekan).
func (r *userRepo) IsEmailTaken(email, excludeID string) (bool, error) {
	var count int64
	err := r.db.Model(&models.User{}).
		Where("email = ? AND id != ? AND deleted_at IS NULL", email, excludeID).
		Count(&count).Error
	return count > 0, err
}
