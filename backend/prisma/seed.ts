import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  MessageRole,
  LogLevel,
} from "../generated/prisma/client";

import bcrypt from "bcryptjs";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data in correct order (to handle foreign key constraints)
  console.log("🧹 Cleaning existing data...");
  await prisma.user.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.apiUsage.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.systemLog.deleteMany();

  // Create sample users
  console.log("👥 Creating users...");

  // Create an admin/test user with email
  const hashedPassword = await bcrypt.hash("passWord123", 10);
  const adminUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: "admin@mindease.com",
      isAnonymous: false,
      hashedId: "admin_hashed_id_" + Date.now(),
      password: hashedPassword,
      isDeletedAt: null, // Explicitly set for soft delete support
    },
  });

  // Create some anonymous users
  const anonymousUsers = await Promise.all([
    prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        isAnonymous: true,
        hashedId: "anon_user_1_" + Date.now(),
        isDeletedAt: null, // Explicitly set for soft delete support
      },
    }),
    prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        isAnonymous: true,
        hashedId: "anon_user_2_" + Date.now(),
        isDeletedAt: null, // Explicitly set for soft delete support
      },
    }),
    prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: "user@example.com",
        isAnonymous: false,
        hashedId: "user_hashed_id_" + Date.now(),
        password: hashedPassword,
        isDeletedAt: null, // Explicitly set for soft delete support
      },
    }),
    // Create a soft-deleted user to demonstrate the functionality
    prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: "deleted@example.com",
        isAnonymous: false,
        hashedId: "deleted_user_" + Date.now(),
        password: hashedPassword,
        isDeletedAt: new Date(Date.now() - 60000 * 30), // Deleted 30 minutes ago
      },
    }),
  ]);

  // Create additional normal users
  const additionalNormalUsers = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: `user${i + 1}@mindease.com`,
          isAnonymous: false,
          hashedId: `user${i + 1}_hashed_` + Date.now(),
          password: hashedPassword,
          isDeletedAt: null,
        },
      }),
    ),
  );

  console.log(
    `✅ Created ${
      1 + anonymousUsers.length + additionalNormalUsers.length
    } users`,
  );

  // Create sessions for users
  console.log("🔐 Creating sessions...");
  const sessions = await Promise.all([
    prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        token: "admin_session_token_" + crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    }),
    prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        userId: anonymousUsers[0].id,
        token: "anon_session_token_" + crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      },
    }),
  ]);

  console.log(`✅ Created ${sessions.length} sessions`);

  // Create conversations
  console.log("💬 Creating conversations...");
  const conversations = await Promise.all([
    // Admin user conversations
    prisma.conversation.create({
      data: {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        title: "Welcome to MindEase",
        isActive: true,
      },
    }),
    prisma.conversation.create({
      data: {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        title: "Stress Management Session",
        isActive: true,
      },
    }),
    // Anonymous user conversations
    prisma.conversation.create({
      data: {
        id: crypto.randomUUID(),
        userId: anonymousUsers[0].id,
        title: "First Time Chat",
        isActive: true,
      },
    }),
    prisma.conversation.create({
      data: {
        id: crypto.randomUUID(),
        userId: anonymousUsers[1].id,
        title: "Anxiety Support",
        isActive: false,
      },
    }),
    prisma.conversation.create({
      data: {
        id: crypto.randomUUID(),
        userId: anonymousUsers[2].id,
        title: "Mental Health Check-in",
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${conversations.length} conversations`);

  // Create messages for conversations
  console.log("📝 Creating messages...");

  // Messages for first conversation (Welcome to MindEase)
  await Promise.all([
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversations[0].id,
        content:
          "Hello! I'm new to MindEase. Can you help me understand how this works?",
        role: MessageRole.USER,
        timestamp: new Date(Date.now() - 60000 * 10), // 10 minutes ago
      },
    }),
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversations[0].id,
        content:
          "Welcome to MindEase! I'm here to provide you with emotional support and guidance. Our conversations are confidential and designed to help you navigate through various life challenges. How are you feeling today?",
        role: MessageRole.ASSISTANT,
        timestamp: new Date(Date.now() - 60000 * 9), // 9 minutes ago
        metadata: {
          model: "gpt-4",
          tokens_used: 45,
          response_time: 1200,
        },
      },
    }),
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversations[0].id,
        content:
          "I've been feeling quite overwhelmed lately with work and personal responsibilities.",
        role: MessageRole.USER,
        timestamp: new Date(Date.now() - 60000 * 8), // 8 minutes ago
      },
    }),
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversations[0].id,
        content:
          "I understand that feeling overwhelmed can be really challenging. It sounds like you're juggling a lot right now. Let's explore some strategies that might help you manage these feelings. Can you tell me more about what specific aspects of work and personal life are feeling most overwhelming?",
        role: MessageRole.ASSISTANT,
        timestamp: new Date(Date.now() - 60000 * 7), // 7 minutes ago
        metadata: {
          model: "gpt-4",
          tokens_used: 52,
          response_time: 1450,
        },
      },
    }),
  ]);

  // Messages for stress management conversation
  await Promise.all([
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversations[1].id,
        content:
          "I need help with stress management techniques. I've been having trouble sleeping.",
        role: MessageRole.USER,
        timestamp: new Date(Date.now() - 60000 * 30), // 30 minutes ago
      },
    }),
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversations[1].id,
        content:
          "Sleep difficulties often go hand-in-hand with stress. Let's work on some techniques that can help with both. Here are a few evidence-based strategies:\n\n1. **Progressive Muscle Relaxation**: Tense and release each muscle group\n2. **4-7-8 Breathing**: Inhale for 4, hold for 7, exhale for 8\n3. **Sleep Hygiene**: Consistent bedtime routine and limiting screens before bed\n\nWhich of these resonates with you, or would you like me to explain any of them in more detail?",
        role: MessageRole.ASSISTANT,
        timestamp: new Date(Date.now() - 60000 * 29), // 29 minutes ago
        metadata: {
          model: "gpt-4",
          tokens_used: 78,
          response_time: 1800,
        },
      },
    }),
  ]);

  // Messages for anonymous user conversation
  await Promise.all([
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversations[2].id,
        content: "Hi, I'm feeling anxious about starting a new job tomorrow.",
        role: MessageRole.USER,
        timestamp: new Date(Date.now() - 60000 * 5), // 5 minutes ago
      },
    }),
    prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversationId: conversations[2].id,
        content:
          "Starting a new job is a significant life transition, and it's completely normal to feel anxious about it. This shows that this opportunity matters to you. Let's talk about what specifically is making you feel anxious - is it meeting new people, learning new responsibilities, or something else?",
        role: MessageRole.ASSISTANT,
        timestamp: new Date(Date.now() - 60000 * 4), // 4 minutes ago
        metadata: {
          model: "gpt-3.5-turbo",
          tokens_used: 41,
          response_time: 950,
        },
      },
    }),
  ]);

  console.log("✅ Created sample messages");

  // Create system logs
  console.log("📊 Creating system logs...");
  const systemLogs = await Promise.all([
    prisma.systemLog.create({
      data: {
        id: crypto.randomUUID(),
        level: LogLevel.INFO,
        message: "Application started successfully",
        source: "server",
        metadata: {
          port: 3000,
          environment: "development",
        },
        timestamp: new Date(Date.now() - 60000 * 60), // 1 hour ago
      },
    }),
    prisma.systemLog.create({
      data: {
        id: crypto.randomUUID(),
        level: LogLevel.INFO,
        message: "Database connection established",
        source: "database",
        metadata: {
          connectionPool: "active",
        },
        timestamp: new Date(Date.now() - 60000 * 59), // 59 minutes ago
      },
    }),
    prisma.systemLog.create({
      data: {
        id: crypto.randomUUID(),
        level: LogLevel.WARN,
        message: "High API usage detected",
        source: "ai-service",
        metadata: {
          endpoint: "/chat/completion",
          usage_count: 150,
        },
        timestamp: new Date(Date.now() - 60000 * 20), // 20 minutes ago
      },
    }),
    prisma.systemLog.create({
      data: {
        id: crypto.randomUUID(),
        level: LogLevel.DEBUG,
        message: "WebSocket connection established",
        source: "websocket-service",
        metadata: {
          clientId: "client_" + crypto.randomUUID().slice(0, 8),
        },
        timestamp: new Date(Date.now() - 60000 * 10), // 10 minutes ago
      },
    }),
    prisma.systemLog.create({
      data: {
        id: crypto.randomUUID(),
        level: LogLevel.INFO,
        message: "User account soft deleted",
        source: "user-service",
        metadata: {
          userId: anonymousUsers[3].id, // The soft-deleted user
          email: "deleted@example.com",
          reason: "User requested account deletion",
        },
        timestamp: new Date(Date.now() - 60000 * 30), // 30 minutes ago (matches deletion time)
      },
    }),
    prisma.systemLog.create({
      data: {
        id: crypto.randomUUID(),
        level: LogLevel.INFO,
        message: "Soft deleted user attempted login - access denied",
        source: "auth-service",
        metadata: {
          userId: anonymousUsers[3].id,
          email: "deleted@example.com",
          action: "login_attempt_blocked",
        },
        timestamp: new Date(Date.now() - 60000 * 10), // 10 minutes ago
      },
    }),
  ]);

  console.log(`✅ Created ${systemLogs.length} system logs`);

  // Create error logs
  console.log("🚨 Creating error logs...");
  const errorLogs = await Promise.all([
    prisma.errorLog.create({
      data: {
        id: crypto.randomUUID(),
        error: "AI API rate limit exceeded",
        stack:
          "RateLimitError: Request rate limit exceeded\n    at ApiService.makeRequest (/src/services/ai-service.ts:45:12)",
        context: {
          endpoint: "/v1/chat/completions",
          userId: anonymousUsers[0].id,
          requestId: "req_" + crypto.randomUUID().slice(0, 8),
        },
        resolved: true,
        resolvedAt: new Date(Date.now() - 60000 * 15), // Resolved 15 minutes ago
        timestamp: new Date(Date.now() - 60000 * 45), // Error occurred 45 minutes ago
      },
    }),
    prisma.errorLog.create({
      data: {
        id: crypto.randomUUID(),
        error: "Database connection timeout",
        stack:
          "ConnectionTimeoutError: Connection to database timed out\n    at DatabaseService.connect (/src/config/database.ts:23:8)",
        context: {
          operation: "user_lookup",
          timeout: 5000,
        },
        resolved: false,
        timestamp: new Date(Date.now() - 60000 * 5), // 5 minutes ago
      },
    }),
    prisma.errorLog.create({
      data: {
        id: crypto.randomUUID(),
        error: "Attempted login by soft-deleted user",
        stack:
          "AuthenticationError: User account has been deactivated\n    at AuthService.validateUser (/src/routes/auth.ts:208:12)",
        context: {
          userId: anonymousUsers[3].id, // The soft-deleted user
          email: "deleted@example.com",
          isDeletedAt: "2025-08-16T12:30:00.000Z",
        },
        resolved: true,
        resolvedAt: new Date(Date.now() - 60000 * 2), // Resolved 2 minutes ago
        timestamp: new Date(Date.now() - 60000 * 10), // Error occurred 10 minutes ago
      },
    }),
  ]);

  console.log(`✅ Created ${errorLogs.length} error logs`);

  // Create API usage logs
  console.log("📈 Creating API usage logs...");
  const apiUsageData = [
    {
      endpoint: "/api/auth/login",
      method: "POST",
      userId: adminUser.id,
      tokens: null,
      cost: null,
      responseTime: 245,
    },
    {
      endpoint: "/api/chat/send",
      method: "POST",
      userId: adminUser.id,
      tokens: 45,
      cost: 0.0009,
      responseTime: 1200,
    },
    {
      endpoint: "/api/chat/send",
      method: "POST",
      userId: anonymousUsers[0].id,
      tokens: 52,
      cost: 0.001,
      responseTime: 1450,
    },
    {
      endpoint: "/api/chat/send",
      method: "POST",
      userId: anonymousUsers[0].id,
      tokens: 78,
      cost: 0.0016,
      responseTime: 1800,
    },
    {
      endpoint: "/api/conversations",
      method: "GET",
      userId: adminUser.id,
      tokens: null,
      cost: null,
      responseTime: 89,
    },
    {
      endpoint: "/api/chat/send",
      method: "POST",
      userId: anonymousUsers[1].id,
      tokens: 41,
      cost: 0.0008,
      responseTime: 950,
    },
    {
      endpoint: "/api/users/profile",
      method: "GET",
      userId: anonymousUsers[2].id, // The regular user (not soft-deleted)
      tokens: null,
      cost: null,
      responseTime: 156,
    },
    {
      endpoint: "/api/health",
      method: "GET",
      userId: null,
      tokens: null,
      cost: null,
      responseTime: 23,
    },
    {
      endpoint: "/api/auth/login",
      method: "POST",
      userId: anonymousUsers[2].id, // The regular user
      tokens: null,
      cost: null,
      responseTime: 189,
    },
    // Historical data from soft-deleted user (before deletion)
    {
      endpoint: "/api/chat/send",
      method: "POST",
      userId: anonymousUsers[3].id, // The soft-deleted user
      tokens: 35,
      cost: 0.0007,
      responseTime: 1100,
    },
  ];

  const apiUsageLogs = await Promise.all(
    apiUsageData.map((usage, index) =>
      prisma.apiUsage.create({
        data: {
          id: crypto.randomUUID(),
          userId: usage.userId,
          endpoint: usage.endpoint,
          method: usage.method,
          tokens: usage.tokens,
          cost: usage.cost,
          responseTime: usage.responseTime,
          timestamp: new Date(Date.now() - 60000 * (90 - index * 8)), // Spread over the last 90 minutes
        },
      }),
    ),
  );

  console.log(`✅ Created ${apiUsageLogs.length} API usage logs`);

  // Create crisis resources (Nigeria-focused)
  console.log("🆘 Creating crisis resources...");
  const crisisResources = await Promise.all([
    // Critical/Emergency Resources - Nigeria
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "SURPIN Helpline Nigeria",
        description:
          "The SURPIN (Suicide Research and Prevention Initiative) Helpline is a 24-hour hotline that offers counselling, support, and intervention for people experiencing suicidal thoughts or mental health crises.",
        type: "hotline",
        contact: "080 0078 7746",
        available: "24/7",
        country: "NG",
        priority: 100,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "SURPIN WhatsApp Support",
        description:
          "Reach SURPIN via WhatsApp for confidential support and crisis intervention",
        type: "whatsapp",
        contact: "+234 903 232 1483",
        available: "24/7",
        country: "NG",
        priority: 98,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "Asido Foundation Psychological Helpline",
        description:
          "The Psychological Helpline service provides psychological First Aid to people in distress. Staffed by trained counselors and volunteers.",
        type: "hotline",
        contact: "+234 902 808 0416",
        available: "24/7",
        country: "NG",
        priority: 95,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "Emergency Services Nigeria",
        description:
          "For immediate life-threatening emergencies, contact emergency services",
        type: "emergency",
        contact: "112 or 199",
        available: "24/7",
        country: "NG",
        priority: 100,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "Women Safe House Sustenance Initiative",
        description:
          "24-hour crisis helpline dedicated to protecting and supporting women and girls in crisis situations, including domestic violence and abuse.",
        type: "hotline",
        contact: "+234 812 113 3399",
        available: "24/7",
        country: "NG",
        priority: 90,
        isActive: true,
      },
    }),

    // High Priority Resources - Nigeria
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "Mentally Aware Nigeria Initiative (MANI)",
        description:
          "MANI offers free and confidential mental health support and information over the phone. Staffed by trained counselors and volunteers.",
        type: "hotline",
        contact: "0809 111 6264",
        available: "Monday - Saturday, 9:00 AM - 5:00 PM",
        country: "NG",
        priority: 85,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "The Cece Yara 24 Hour Child Helpline",
        description:
          "Managed by trained staff with experience listening to children and young people. Provides support for children in crisis.",
        type: "hotline",
        contact: "0800 800 8001",
        available: "24/7",
        country: "NG",
        priority: 88,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "Cece Yara SMS Support",
        description: "Text-based crisis support for children and young people",
        type: "text",
        contact: "09029880445",
        available: "24/7",
        country: "NG",
        priority: 86,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "HDI Child Helpline",
        description:
          "Human Development Initiative provides free, compassionate and confidential support for children and youth.",
        type: "hotline",
        contact: "0808 0551 376",
        available: "Monday - Friday, 9:00 AM - 5:00 PM",
        country: "NG",
        priority: 80,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "HDI WhatsApp Support",
        description: "WhatsApp support line for children and youth in crisis",
        type: "whatsapp",
        contact: "+234 802 320 5110",
        available: "Monday - Friday, 9:00 AM - 5:00 PM",
        country: "NG",
        priority: 78,
        isActive: true,
      },
    }),

    // Online Resources - Nigeria
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "SURPIN Website",
        description:
          "Access online resources, information, and support materials",
        type: "website",
        contact: "https://www.surpinng.com/",
        available: "24/7",
        country: "NG",
        priority: 72,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "Asido Foundation Website",
        description:
          "Mental health resources and information about support services",
        type: "website",
        contact: "https://asidofoundation.com/",
        available: "24/7",
        country: "NG",
        priority: 70,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "Mentally Aware Nigeria Website",
        description:
          "Mental health awareness resources and support information",
        type: "website",
        contact: "https://mentallyaware.org/",
        available: "24/7",
        country: "NG",
        priority: 68,
        isActive: true,
      },
    }),
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "Find A Helpline Nigeria",
        description:
          "Comprehensive directory of mental health and crisis helplines in Nigeria",
        type: "website",
        contact: "https://findahelpline.com/countries/ng",
        available: "24/7",
        country: "NG",
        priority: 75,
        isActive: true,
      },
    }),

    // Global Fallback Resources
    prisma.crisisResource.create({
      data: {
        id: crypto.randomUUID(),
        title: "International Association for Suicide Prevention",
        description: "Global directory of crisis centers and support resources",
        type: "website",
        contact: "https://www.iasp.info/resources/Crisis_Centres/",
        available: "24/7",
        country: "global",
        priority: 50,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${crisisResources.length} crisis resources`);

  console.log("🎉 Database seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(
    `  • Users: ${
      1 + anonymousUsers.length + additionalNormalUsers.length
    } (1 admin, ${
      2 + 1 + additionalNormalUsers.length
    } active users, 1 soft-deleted)`,
  );
  console.log(`  • Sessions: ${sessions.length}`);
  console.log(`  • Conversations: ${conversations.length}`);
  console.log(`  • Messages: Multiple sample conversations`);
  console.log(`  • System Logs: ${systemLogs.length}`);
  console.log(`  • Error Logs: ${errorLogs.length}`);
  console.log(`  • API Usage Logs: ${apiUsageLogs.length}`);
  console.log(`  • Crisis Resources: ${crisisResources.length}`);
  console.log("\n🔐 Test Credentials:");
  console.log("  Admin: admin@mindease.com / password123");
  console.log("  User: user@example.com / password123");
  console.log(
    "  Additional Users: user1@mindease.com to user10@mindease.com / password123",
  );
  console.log(
    "  Soft-deleted User: deleted@example.com / password123 (should not be able to login)",
  );
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
