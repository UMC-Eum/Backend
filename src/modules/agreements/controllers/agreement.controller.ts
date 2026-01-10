import { Controller, Get } from '@nestjs/common';
import { AgreementService } from '../services/agreement.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AgreementController {
    constructor(private readonly agreementService: AgreementService) {};


    @ApiOperation({ summary: '마케팅 동의 목록 조회 '})
    @ApiResponse({
        description: '마케팅 동의 목록 조회 성공',
        schema: {
            example: {
            resultType: 'SUCCESS',
            success: {
                data: [
                {
                    agreementId: '2',
                    body: 'SMS 수신 동의',
                },
                {
                    agreementId: '1',
                    body: '이메일 수신 동의',
                },
                ],
            },
            error: null,
            meta: {
                timestamp: '2026-01-10T09:34:07.015Z',
                path: '/api/v1/agreements',
            },
            },
        },
        })
    @Get('/agreements')
    findAll(){
        // 추후 삭제 예정 (AUTH 구현 전 테스트용)
        const userId = 1;
        return this.agreementService.findAll(userId);
    }
}
