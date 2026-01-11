import { Controller, Get, Post, Body } from '@nestjs/common';
import { AgreementService } from '../services/agreement.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserAgreementRequestDto } from '../dtos/agreement.dto';

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
            data: {
                items:[
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
    }})
    @Get('/agreements')
    findAll(){
        return this.agreementService.findAll();
    }

    @ApiOperation( {summary : '마케팅 동의 생성/수정'})
    @ApiBody({
        type: CreateUserAgreementRequestDto
    })
    @ApiResponse({
        description: '마케팅 동의 생성/수정 성공',
        schema: {
        example: {
        resultType: 'SUCCESS',
        success: {
            data: {}
        },
        error: null,
        meta: {
            timestamp: '2026-01-10T09:53:11.014Z',
            path: '/api/v1/users/me/agreements',
        },
        },
    },
    })
    @Post('/users/me/agreements')
    // AUTH 구현 전 임시로 userId 하드코딩
    async upsertUserMarketingAgreement(@Body() body: CreateUserAgreementRequestDto){
        const userId = 1;
        for (const agreement of body.marketingAgreements) {
            const { marketingAgreementId, isAgreed } = agreement;
        await this.agreementService.upsertUserMarketingAgreement(userId, marketingAgreementId, isAgreed);
        }
    }
}
