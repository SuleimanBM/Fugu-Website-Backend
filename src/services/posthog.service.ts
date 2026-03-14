import { Injectable } from '@nestjs/common';

@Injectable()
export class PosthogService {
    private readonly host = process.env.POSTHOG_HOST ?? 'https://app.posthog.com';
    private readonly projectId = process.env.POSTHOG_PROJECT_ID;
    private readonly apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

    private async runQuery(query: string): Promise<any[][]> {
        if (!this.projectId || !this.apiKey) return [];

        const res = await fetch(
            `${this.host}/api/projects/${this.projectId}/query/`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
            },
        );

        if (!res.ok) return [];
        const data = await res.json();
        return data.results ?? [];
    }

    async getDailyTraffic(days = 30) {
        const rows = await this.runQuery(`
      SELECT
        toDate(timestamp) AS date,
        count(DISTINCT distinct_id) AS visitors,
        count() AS pageviews
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY date
      ORDER BY date ASC
    `);
        return rows.map(([date, visitors, pageviews]) => ({
            date,
            visitors: Number(visitors),
            pageviews: Number(pageviews),
        }));
    }

    async getTopPages(days = 30, limit = 10) {
        const rows = await this.runQuery(`
      SELECT
        properties.path AS path,
        count() AS views,
        count(DISTINCT distinct_id) AS unique_visitors
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY path
      ORDER BY views DESC
      LIMIT ${limit}
    `);
        return rows.map(([path, views, unique_visitors]) => ({
            path,
            views: Number(views),
            unique_visitors: Number(unique_visitors),
        }));
    }

    async getTopViewedProducts(days = 30, limit = 10) {
        const rows = await this.runQuery(`
      SELECT
        properties.product_title AS product_title,
        properties.product_id AS product_id,
        count() AS views
      FROM events
      WHERE event = 'product_viewed'
        AND timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY product_title, product_id
      ORDER BY views DESC
      LIMIT ${limit}
    `);
        return rows.map(([product_title, product_id, views]) => ({
            product_title,
            product_id,
            views: Number(views),
        }));
    }

    async getAddToCartEvents(days = 30, limit = 10) {
        const rows = await this.runQuery(`
      SELECT
        properties.product_title AS product_title,
        count() AS add_to_cart_count,
        sum(toInt64OrZero(toString(properties.quantity))) AS total_quantity
      FROM events
      WHERE event = 'add_to_cart'
        AND timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY product_title
      ORDER BY add_to_cart_count DESC
      LIMIT ${limit}
    `);
        return rows.map(([product_title, add_to_cart_count, total_quantity]) => ({
            product_title,
            add_to_cart_count: Number(add_to_cart_count),
            total_quantity: Number(total_quantity),
        }));
    }

    async getConversionFunnel(days = 30) {
        const eventNames = [
            'product_viewed',
            'add_to_cart',
            'checkout_started',
            'order_placed',
        ];

        const counts = await Promise.all(
            eventNames.map(event =>
                this.runQuery(`
          SELECT count(DISTINCT distinct_id)
          FROM events
          WHERE event = '${event}'
            AND timestamp >= now() - INTERVAL ${days} DAY
        `).then(r => Number(r[0]?.[0] ?? 0)),
            ),
        );

        const labels = ['Product Views', 'Add to Cart', 'Checkout', 'Orders'];
        const top = counts[0] || 1;

        return counts.map((count, i) => ({
            stage: labels[i],
            count,
            rate: i === 0 ? '100%' : `${((count / top) * 100).toFixed(1)}%`,
        }));
    }

    async getTopSearches(days = 30, limit = 10) {
        const rows = await this.runQuery(`
      SELECT
        properties.query AS query,
        count() AS count,
        avg(toInt64OrZero(toString(properties.result_count))) AS avg_results
      FROM events
      WHERE event = 'search'
        AND timestamp >= now() - INTERVAL ${days} DAY
        AND properties.query IS NOT NULL
      GROUP BY query
      ORDER BY count DESC
      LIMIT ${limit}
    `);
        return rows.map(([query, count, avg_results]) => ({
            query,
            count: Number(count),
            avg_results: Number(Number(avg_results).toFixed(0)),
        }));
    }

    async getWebsiteSummary(days = 30) {
        const [visitors, pageviews, carts, orders] = await Promise.all([
            this.runQuery(`SELECT count(DISTINCT distinct_id) FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY`)
                .then(r => Number(r[0]?.[0] ?? 0)),
            this.runQuery(`SELECT count() FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY`)
                .then(r => Number(r[0]?.[0] ?? 0)),
            this.runQuery(`SELECT count() FROM events WHERE event = 'add_to_cart' AND timestamp >= now() - INTERVAL ${days} DAY`)
                .then(r => Number(r[0]?.[0] ?? 0)),
            this.runQuery(`SELECT count() FROM events WHERE event = 'order_placed' AND timestamp >= now() - INTERVAL ${days} DAY`)
                .then(r => Number(r[0]?.[0] ?? 0)),
        ]);

        return {
            totalVisitors: visitors,
            totalPageViews: pageviews,
            totalAddToCart: carts,
            totalOrdersPlaced: orders,
        };
    }
}