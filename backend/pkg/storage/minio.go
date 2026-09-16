package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var MinioClient *minio.Client
var BucketName string
var MinioAvailable bool

var publicMinioEndpoint string

// InitMinio menerima parameter dari AppConfig (bukan os.Getenv langsung).
// Semua konfigurasi dibaca di satu tempat (config.Load) — tidak tersebar.
func InitMinio(endpoint, accessKey, secretKey, bucket string, useSSL bool) {
	BucketName = bucket
	publicMinioEndpoint = endpoint // simpan untuk replace di presigned URL

	client, err := minio.New(endpoint, &minio.Options{
		Creds: credentials.NewStaticV4(accessKey, secretKey, ""), Secure: useSSL,
	})
	if err != nil {
		log.Printf("⚠️  MinIO tidak tersambung: %v — upload file tidak tersedia", err)
		MinioAvailable = false; return
	}
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, BucketName)
	if err != nil {
		log.Printf("⚠️  MinIO error: %v", err)
		log.Println("   Jalankan: minio.exe server C:\\minio\\data --console-address :9001")
		MinioAvailable = false; return
	}
	if !exists {
		if err := client.MakeBucket(ctx, BucketName, minio.MakeBucketOptions{}); err != nil {
			log.Printf("⚠️  Gagal buat bucket: %v", err); MinioAvailable = false; return
		}
		log.Printf("✅ Bucket '%s' dibuat", BucketName)
	}
	MinioClient = client; MinioAvailable = true
	log.Println("✅ MinIO terkoneksi!")
}

func UploadFile(file multipart.File, header *multipart.FileHeader, folder string) (string, error) {
	if !MinioAvailable { return "", fmt.Errorf("MinIO tidak tersedia — jalankan MinIO untuk upload file") }
	ext := filepath.Ext(header.Filename)
	objName := fmt.Sprintf("%s/%d%s", folder, time.Now().UnixNano(), ext)
	_, err := MinioClient.PutObject(context.Background(), BucketName, objName, file, header.Size,
		minio.PutObjectOptions{ContentType: header.Header.Get("Content-Type")})
	if err != nil { return "", fmt.Errorf("gagal upload: %w", err) }
	return objName, nil
}

// GetFileURL — presigned URL untuk PREVIEW (tampil inline di browser/tab baru)
func GetFileURL(objectPath string) (string, error) {
	return presignedURL(objectPath, nil)
}

// GetFileDownloadURL — presigned URL yang memaksa browser men-download file
// (Content-Disposition: attachment) alih-alih hanya membukanya inline.
//
// Tombol "download" sebelumnya memakai URL preview yang sama + atribut HTML
// `download`, tapi karena MinIO ada di origin/port berbeda dari frontend,
// atribut `download` diabaikan browser untuk URL cross-origin — file selalu
// terbuka di tab baru, tidak pernah benar-benar ter-download. Generate URL
// terpisah dengan header response-content-disposition ini memperbaikinya
// karena browser mengikuti header dari server, bukan atribut HTML.
func GetFileDownloadURL(objectPath, filename string) (string, error) {
	reqParams := make(url.Values)
	if filename == "" {
		filename = filepath.Base(objectPath)
	}
	reqParams.Set("response-content-disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return presignedURL(objectPath, reqParams)
}

func presignedURL(objectPath string, reqParams url.Values) (string, error) {
	if !MinioAvailable { return "", fmt.Errorf("MinIO tidak tersedia") }
	u, err := MinioClient.PresignedGetObject(context.Background(), BucketName, objectPath, time.Hour, reqParams)
	if err != nil { return "", err }

	// PERBAIKAN KRITIS: MinIO client menggunakan endpoint internal Docker (minio:9000)
	// saat generate presigned URL. URL ini tidak bisa diakses browser dari luar Docker.
	// Kita replace host internal dengan localhost:9000 supaya browser bisa membuka file.
	// Untuk production/deploy ke server, ganti dengan domain publik MinIO Anda.
	publicHost := os.Getenv("MINIO_PUBLIC_ENDPOINT")
	if publicHost == "" {
		publicHost = "localhost:9000"
	}
	u.Host = publicHost
	u.Scheme = "http"

	return u.String(), nil
}

func GetFileStream(objectPath string) (io.ReadCloser, *minio.ObjectInfo, error) {
	if !MinioAvailable { return nil, nil, fmt.Errorf("MinIO tidak tersedia") }
	obj, err := MinioClient.GetObject(context.Background(), BucketName, objectPath, minio.GetObjectOptions{})
	if err != nil { return nil, nil, err }
	info, err := obj.Stat()
	if err != nil { return nil, nil, err }
	return obj, &info, nil
}

func DeleteFile(objectPath string) error {
	if !MinioAvailable { return nil }
	return MinioClient.RemoveObject(context.Background(), BucketName, objectPath, minio.RemoveObjectOptions{})
}