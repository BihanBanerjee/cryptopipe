import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Creating TimescaleDB extension...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
    
    console.log('🔧 Converting trades table to hypertable...');
    await prisma.$executeRawUnsafe(
      `SELECT create_hypertable('trades', 'time', if_not_exists => TRUE)`
    );
  } catch (error: any) {
    if (error.message.includes('already a hypertable')) {
      console.log('✅ Table is already a hypertable, continuing...');
    } else {
      throw error;
    }
  }

  console.log('🧹 Cleaning up existing materialized views...');
  await prisma.$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS trades_1m CASCADE;`);
  await prisma.$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS trades_2m CASCADE;`);
  await prisma.$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS trades_5m CASCADE;`);
  await prisma.$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS trades_10m CASCADE;`);
  await prisma.$executeRawUnsafe(`DROP MATERIALIZED VIEW IF EXISTS trades_1d CASCADE;`);

  console.log('📊 Creating 1-minute continuous aggregate...');
  await prisma.$executeRawUnsafe(`
    CREATE MATERIALIZED VIEW trades_1m
    WITH (timescaledb.continuous) AS
    SELECT time_bucket('1 minute', time) AS bucket,
        symbol,
        first("priceInt"::numeric / 100000000, time) AS open,
        max("priceInt"::numeric / 100000000) AS high,
        min("priceInt"::numeric / 100000000) AS low,
        last("priceInt"::numeric / 100000000, time) AS close,
        sum("qtyInt"::numeric / 100000000) AS volume
    FROM trades
    GROUP BY bucket, symbol
  `);

  console.log('📊 Creating 2-minute continuous aggregate...');
  await prisma.$executeRawUnsafe(`
    CREATE MATERIALIZED VIEW trades_2m
    WITH (timescaledb.continuous) AS
    SELECT time_bucket('2 minutes', time) AS bucket,
           symbol,
           first("priceInt"::numeric / 100000000, time) AS open,
           max("priceInt"::numeric / 100000000) AS high,
           min("priceInt"::numeric / 100000000) AS low,
           last("priceInt"::numeric / 100000000, time) AS close,
           sum("qtyInt"::numeric / 100000000) AS volume
    FROM trades
    GROUP BY bucket, symbol
  `);

  console.log('📊 Creating 5-minute continuous aggregate...');
  await prisma.$executeRawUnsafe(`
    CREATE MATERIALIZED VIEW trades_5m
    WITH (timescaledb.continuous) AS
    SELECT time_bucket('5 minutes', time) AS bucket,
           symbol,
           first("priceInt"::numeric / 100000000, time) AS open,
           max("priceInt"::numeric / 100000000) AS high,
           min("priceInt"::numeric / 100000000) AS low,
           last("priceInt"::numeric / 100000000, time) AS close,
           sum("qtyInt"::numeric / 100000000) AS volume
    FROM trades
    GROUP BY bucket, symbol
  `);

  console.log('📊 Creating 10-minute continuous aggregate...');
  await prisma.$executeRawUnsafe(`
    CREATE MATERIALIZED VIEW trades_10m
    WITH (timescaledb.continuous) AS
    SELECT time_bucket('10 minutes', time) AS bucket,
           symbol,
           first("priceInt"::numeric / 100000000, time) AS open,
           max("priceInt"::numeric / 100000000) AS high,
           min("priceInt"::numeric / 100000000) AS low,
           last("priceInt"::numeric / 100000000, time) AS close,
           sum("qtyInt"::numeric / 100000000) AS volume
    FROM trades
    GROUP BY bucket, symbol
  `);

  console.log('📊 Creating daily continuous aggregate...');
  await prisma.$executeRawUnsafe(`
    CREATE MATERIALIZED VIEW trades_1d
    WITH (timescaledb.continuous) AS
    SELECT time_bucket('1 day', time) AS bucket,
           symbol,
           first("priceInt"::numeric / 100000000, time) AS open,
           max("priceInt"::numeric / 100000000) AS high,
           min("priceInt"::numeric / 100000000) AS low,
           last("priceInt"::numeric / 100000000, time) AS close,
           sum("qtyInt"::numeric / 100000000) AS volume
    FROM trades
    GROUP BY bucket, symbol
  `);

  console.log('⚡ Setting up refresh policies for real-time updates...');
  try {
    await prisma.$executeRawUnsafe(`
      SELECT add_continuous_aggregate_policy('trades_1m',
        start_offset => INTERVAL '1 day',
        end_offset   => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    `);
  } catch (error: any) {
    if (error.message.includes('policy already exists')) {
      console.log('✅ Policy already exists for trades_1m');
    } else {
      throw error;
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      SELECT add_continuous_aggregate_policy('trades_2m',
        start_offset => INTERVAL '2 days',
        end_offset   => INTERVAL '2 minutes',
        schedule_interval => INTERVAL '2 minutes'
      );
    `);
  } catch (error: any) {
    if (error.message.includes('policy already exists')) {
      console.log('✅ Policy already exists for trades_2m');
    } else {
      throw error;
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      SELECT add_continuous_aggregate_policy('trades_5m',
        start_offset => INTERVAL '7 days',
        end_offset   => INTERVAL '5 minutes',
        schedule_interval => INTERVAL '5 minutes'
      );
    `);
  } catch (error: any) {
    if (error.message.includes('policy already exists')) {
      console.log('✅ Policy already exists for trades_5m');
    } else {
      throw error;
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      SELECT add_continuous_aggregate_policy('trades_10m',
        start_offset => INTERVAL '14 days',
        end_offset   => INTERVAL '10 minutes',
        schedule_interval => INTERVAL '10 minutes'
      );
    `);
  } catch (error: any) {
    if (error.message.includes('policy already exists')) {
      console.log('✅ Policy already exists for trades_10m');
    } else {
      throw error;
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      SELECT add_continuous_aggregate_policy('trades_1d',
        start_offset => INTERVAL '90 days',
        end_offset   => INTERVAL '1 day',
        schedule_interval => INTERVAL '1 day'
      );
    `);
  } catch (error: any) {
    if (error.message.includes('policy already exists')) {
      console.log('✅ Policy already exists for trades_1d');
    } else {
      throw error;
    }
  }

  console.log('✅ TimescaleDB setup complete with continuous aggregates');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });