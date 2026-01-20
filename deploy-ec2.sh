#!/bin/bash

# EUM Backend EC2 배포 스크립트 (외부 Redis/RDS 사용)

set -e

echo "🚀 EUM Backend EC2 배포 시작..."

# 환경 변수 확인
if [ ! -f ".env" ]; then
    echo "❌ .env 파일이 없습니다!"
    echo "📝 .env 파일을 생성하고 다음 값들을 설정하세요:"
    echo ""
    echo "NODE_ENV=production"
    echo "DATABASE_URL=mysql://username:password@rds-endpoint:3306/database"
    echo "REDIS_URL=redis://elasticache-endpoint:6379"
    echo "JWT_SECRET=your-secure-jwt-secret"
    echo "AWS_ACCESS_KEY_ID=your-aws-access-key"
    echo "AWS_SECRET_ACCESS_KEY=your-aws-secret-key"
    echo "KAKAO_CLIENT_ID=your-kakao-client-id"
    echo "KAKAO_CLIENT_SECRET=your-kakao-client-secret"
    exit 1
fi

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "🔧 Docker 설치 중..."
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-plugin curl
    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "✅ Docker 설치 완료!"
    echo ""
    echo "⚠️  Docker 그룹 권한 적용을 위해 다음 중 하나를 실행하세요:"
    echo "   1. 로그아웃 후 다시 로그인"
    echo "   2. 'newgrp docker' 실행 후 다시 스크립트 실행"
    exit 1
fi

# Docker 서비스 상태 확인
if ! docker ps &> /dev/null; then
    echo "🔄 Docker 서비스 시작 중..."
    sudo systemctl start docker
    sleep 5

    if ! docker ps &> /dev/null; then
        echo "⚠️  Docker 권한 문제입니다. 'newgrp docker' 실행 후 다시 시도하세요."
        exit 1
    fi
fi

echo "✅ Docker 사용 가능"

# .env 파일 환경변수 확인
echo "🔍 환경변수 확인 중..."

# DATABASE_URL 확인
if ! grep -q "DATABASE_URL=" .env || grep -q "DATABASE_URL=mysql://username:password" .env; then
    echo "❌ .env에 올바른 DATABASE_URL이 설정되지 않았습니다."
    echo "현재 설정:"
    grep "DATABASE_URL" .env || echo "  DATABASE_URL 없음"
    exit 1
fi

# REDIS_URL 확인
if ! grep -q "REDIS_URL=" .env || grep -q "REDIS_URL=redis://your-elasticache" .env; then
    echo "❌ .env에 올바른 REDIS_URL이 설정되지 않았습니다."
    echo "현재 설정:"
    grep "REDIS_URL" .env || echo "  REDIS_URL 없음"
    exit 1
fi

# JWT_SECRET 확인
if grep -q "JWT_SECRET=your-" .env; then
    echo "❌ JWT_SECRET을 실제 값으로 변경해주세요."
    exit 1
fi

echo "✅ 필수 환경변수 확인 완료"

# 기존 컨테이너 정리
echo "🧹 기존 컨테이너 정리 중..."
docker compose down --remove-orphans 2>/dev/null || true

# 이미지 빌드
echo "🏗️  Docker 이미지 빌드 중..."
echo "   (이 과정은 몇 분 소요될 수 있습니다...)"
docker compose build --no-cache

# 서비스 시작
echo "🚀 서비스 시작 중..."
docker compose up -d

# 서비스 시작 대기
echo "⏳ 서비스 초기화 대기 중..."
sleep 30

# 서비스 상태 확인
echo ""
echo "📊 서비스 상태:"
docker compose ps

# Health check
echo ""
echo "🧪 Health Check 시작..."
HEALTH_CHECK_SUCCESS=false

for i in {1..30}; do
    echo "  Health check 시도 $i/30..."

    # 컨테이너가 실행 중인지 확인
    if ! docker compose ps | grep -q "running"; then
        echo "❌ 컨테이너가 실행되지 않고 있습니다."
        echo ""
        echo "--- 컨테이너 상태 ---"
        docker compose ps
        echo ""
        echo "--- 로그 확인 ---"
        docker compose logs backend
        exit 1
    fi

    # Health check 수행
    if curl -f --max-time 10 http://localhost:3000/api/v1/health 2>/dev/null; then
        echo "✅ Backend 서비스가 정상적으로 시작되었습니다!"
        HEALTH_CHECK_SUCCESS=true
        break
    fi

    if [ $i -eq 30 ]; then
        echo "❌ Health check 실패 (30회 시도)"
        break
    fi

    sleep 10
done

# 실패한 경우 로그 출력
if [ "$HEALTH_CHECK_SUCCESS" = false ]; then
    echo ""
    echo "❌ 서비스 시작에 실패했습니다. 상세 정보:"
    echo ""
    echo "--- 컨테이너 상태 ---"
    docker compose ps
    echo ""
    echo "--- Backend 로그 (마지막 30줄) ---"
    docker compose logs --tail=30 backend
    echo ""
    echo "🔍 문제 해결 방법:"
    echo "  1. 환경변수 확인: cat .env"
    echo "  2. 전체 로그 확인: docker compose logs backend"
    echo "  3. RDS/ElastiCache 연결 확인"
    echo "  4. EC2 보안 그룹 확인"
    echo "  5. 컨테이너 직접 접속: docker compose exec backend /bin/bash"
    exit 1
fi

# EC2 퍼블릭 IP 확인
echo ""
echo "🌐 EC2 퍼블릭 IP 확인 중..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "확인 실패")

# 최종 정보 출력
echo ""
echo "🎉 EUM Backend 배포 완료!"
echo ""
echo "📋 접근 정보:"
echo "  로컬 접근: http://localhost:3000/api/v1/health"
if [ "$PUBLIC_IP" != "확인 실패" ]; then
    echo "  외부 접근: http://$PUBLIC_IP:3000/api/v1/health"
    echo "  API Base: http://$PUBLIC_IP:3000/api/v1"
else
    echo "  외부 접근: http://[EC2-PUBLIC-IP]:3000/api/v1/health"
fi
echo ""
echo "📊 유용한 명령어들:"
echo "  상태 확인: docker compose ps"
echo "  실시간 로그: docker compose logs -f backend"
echo "  서비스 재시작: docker compose restart backend"
echo "  서비스 중지: docker compose down"
echo "  컨테이너 접속: docker compose exec backend /bin/bash"
echo ""
echo "🔧 EC2 보안 그룹 설정 필요:"
echo "   인바운드 규칙 → 사용자 지정 TCP → 포트 3000 → 소스: 0.0.0.0/0"
echo ""
echo "🔗 데이터베이스 연결 확인:"
echo "   RDS: $(grep DATABASE_URL .env | cut -d'@' -f2 | cut -d'/' -f1)"
echo "   Redis: $(grep REDIS_URL .env | cut -d'/' -f3)"
