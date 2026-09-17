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
var MinioClient *minio.Client       // client internal (minio:9000) — untuk upload/download
var publicMinioClient *minio.Client // client publik (localhost:9000) — untuk presigned URL
var BucketName string
var MinioAvailable bool

// InitMinio menerima parameter dari AppConfig.
// Membuat DUA client:
//  1. MinioClient (internal) — untuk operasi upload/download di dalam Docker
//  2. publicMinioClient     — untuk generate presigned URL yang bisa dibuka browser
//
// ALASAN: presigned URL mengandung signature yang dihitung berdasarkan host.
// Kalau client pakai host "minio:9000" lalu kita ganti hostnya ke "localhost:9000",
// signature tidak cocok → SignatureDoesNotMatch error.
// Solusinya: buat client kedua yang sudah pakai host publik sejak awal.
func InitMinio(endpoint, accessKey, secretKey, bucket string, useSSL bool) {
	BucketName = bucket

	// Client 1: internal — untuk upload/download file
	internalClient, err := minio.New(endpoint, &minio.Options{
		Creds: credentials.NewStaticV4(accessKey, secretKey, ""), Secure: useSSL,
	})
	if err != nil {
		log.Printf("⚠️  MinIO tidak tersambung: %v — upload file tidak tersedia", err)
		MinioAvailable = false
		return
	}

	// Pastikan bucket ada
	ctx := context.Background()
	exists, err := internalClient.BucketExists(ctx, BucketName)
	if err != nil {
		log.Printf("⚠️  MinIO error: %v", err)
		MinioAvailable = false
		return
	}
	if !exists {
		if err := internalClient.MakeBucket(ctx, BucketName, minio.MakeBucketOptions{}); err != nil {
			log.Printf("⚠️  Gagal buat bucket: %v", err)
			MinioAvailable = false
			return
		}
		log.Printf("✅ Bucket '%s' dibuat", BucketName)
	}
	MinioClient = internalClient
	MinioAvailable = true

	// Client 2: publik — untuk presigned URL yang bisa dibuka browser
	// Pakai MINIO_PUBLIC_ENDPOINT (default: localhost:9000)
	publicEndpoint := os.Getenv("MINIO_PUBLIC_ENDPOINT")
	if publicEndpoint == "" {
		publicEndpoint = "localhost:9000"
	}

	pubClient, err := minio.New(publicEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false, // localhost selalu HTTP
	})
	if err != nil {
		log.Printf("⚠️  Gagal buat public MinIO client: %v — file preview tidak tersedia", err)
		publicMinioClient = internalClient // fallback ke internal
	} else {
		publicMinioClient = pubClient
	}

	log.Printf("✅ MinIO terkoneksi! (internal: %s, publik: %s)", endpoint, publicEndpoint)
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
	if !MinioAvailable {
		return "", fmt.Errorf("MinIO tidak tersedia")
	}
	// Gunakan publicMinioClient — client yang sudah dikonfigurasi dengan
	// host publik (localhost:9000) sejak awal, sehingga signature yang
	// dihasilkan valid untuk URL yang dibuka browser.
	client := publicMinioClient
	if client == nil {
		client = MinioClient
	}
	u, err := client.PresignedGetObject(context.Background(), BucketName, objectPath, time.Hour, reqParams)
	if err != nil {
		return "", err
	}
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