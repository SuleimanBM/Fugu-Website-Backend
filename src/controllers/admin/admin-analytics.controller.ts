import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-guard';
import { RolesGuard } from '../../guards/roles-guard';
import { Role } from '../../decorators/roles.decorator';
import { AnalyticsService } from '../../services/analytics.service';
import { PosthogService } from '../../services/posthog.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly posthogService: PosthogService,
  ) {}

  /** GET /api/admin/analytics */
  @Get()
  getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  /** GET /api/admin/analytics/sales-over-time?days=30 */
  @Get('sales-over-time')
  salesOverTime(@Query('days') days?: string) {
    return this.analyticsService.salesOverTime(days ? Number(days) : 30);
  }

  /** GET /api/admin/analytics/top-products?limit=5 */
  @Get('top-products')
  topProducts(@Query('limit') limit?: string) {
    return this.analyticsService.topSellingProducts(limit ? Number(limit) : 5);
  }

  /** GET /api/admin/analytics/website-summary?days=30 */
  @Get('website-summary')
  getWebsiteSummary(@Query('days') days?: string) {
    return this.posthogService.getWebsiteSummary(days ? Number(days) : 30);
  }

  /** GET /api/admin/analytics/daily-traffic?days=30 */
  @Get('daily-traffic')
  getDailyTraffic(@Query('days') days?: string) {
    return this.posthogService.getDailyTraffic(days ? Number(days) : 30);
  }

  /** GET /api/admin/analytics/top-pages?days=30&limit=15 */
  @Get('top-pages')
  getTopPages(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.posthogService.getTopPages(
      days ? Number(days) : 30,
      limit ? Number(limit) : 15,
    );
  }

  /** GET /api/admin/analytics/top-viewed-products?days=30&limit=8 */
  @Get('top-viewed-products')
  getTopViewedProducts(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.posthogService.getTopViewedProducts(
      days ? Number(days) : 30,
      limit ? Number(limit) : 8,
    );
  }

  /** GET /api/admin/analytics/conversion-funnel?days=30 */
  @Get('conversion-funnel')
  getConversionFunnel(@Query('days') days?: string) {
    return this.posthogService.getConversionFunnel(days ? Number(days) : 30);
  }

  /** GET /api/admin/analytics/top-searches?days=30&limit=10 */
  @Get('top-searches')
  getTopSearches(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.posthogService.getTopSearches(
      days ? Number(days) : 30,
      limit ? Number(limit) : 10,
    );
  }

  /** GET /api/admin/analytics/add-to-cart-events?days=30&limit=8 */
  @Get('add-to-cart-events')
  getAddToCartEvents(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.posthogService.getAddToCartEvents(
      days ? Number(days) : 30,
      limit ? Number(limit) : 8,
    );
  }
}
