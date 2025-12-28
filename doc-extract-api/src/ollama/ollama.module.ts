import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OllamaExtractionService } from './ollama-extraction.service';

@Module({
    imports: [HttpModule],
    providers: [OllamaExtractionService],
    exports: [OllamaExtractionService],
})
export class OllamaModule { }
