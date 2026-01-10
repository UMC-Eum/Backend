import { Controller, Get } from '@nestjs/common';
import { AgreementService } from '../services/agreement.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AgreementController {
    constructor(private readonly agreementService: AgreementService) {};


    @ApiOperation({ summary: '마케팅 약관 목록 조회 '})
    @ApiResponse({
    description: '마케팅 약관 목록 조회 성공',
    schema: {
        example: {
        resultType: 'SUCCESS',
        success: {
            data: [
            {
                agreementId: '1',
                body: '이메일 수신 동의',
            },
            {
                agreementId: '2',
                body: 'SMS 수신 동의',
            },
            {
                agreementId: '3',
                body: '푸시 알림 수신 동의',
            },
            {
                agreementId: '4',
                body: '마케팅 정보 수신 동의',
            },
            ],
        },
        error: null,
        meta: {
            timestamp: '2026-01-10T09:53:11.014Z',
            path: '/api/v1/agreements',
        },
        },
    },
    })
    @Get('/agreements')
    findAll(){
        return this.agreementService.findAll();
    }
}
