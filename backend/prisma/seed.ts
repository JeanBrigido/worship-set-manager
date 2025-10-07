import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Service Types ---
  const sunday = await prisma.serviceType.upsert({
    where: { name: "Sunday" },
    update: {},
    create: {
      name: "Sunday",
      defaultStartTime: "10:00",
    },
  });

  const tuesday = await prisma.serviceType.upsert({
    where: { name: "Tuesday" },
    update: {},
    create: {
      name: "Tuesday",
      defaultStartTime: "19:00",
    },
  });

  const youth = await prisma.serviceType.upsert({
    where: { name: "Youth" },
    update: {},
    create: {
      name: "Youth",
      defaultStartTime: "19:00",
      rrule: "FREQ=MONTHLY;BYDAY=FR;BYSETPOS=1", // first Friday monthly
    },
  });

  console.log("✅ Seeded service types:", [sunday.name, tuesday.name, youth.name]);

  // --- Instruments ---
  const instruments = [
    { code: "drums", displayName: "Drums", maxPerSet: 1 },
    { code: "bass", displayName: "Bass", maxPerSet: 1 },
    { code: "egtr1", displayName: "Electric Guitar 1", maxPerSet: 1 },
    { code: "egtr2", displayName: "Electric Guitar 2", maxPerSet: 1 },
    { code: "acoustic", displayName: "Acoustic Guitar", maxPerSet: 1 },
    { code: "singer1", displayName: "Singer 1", maxPerSet: 1 },
    { code: "singer2", displayName: "Singer 2", maxPerSet: 1 },
    { code: "singer3", displayName: "Singer 3", maxPerSet: 1 },
    { code: "singer4", displayName: "Singer 4", maxPerSet: 1 },
  ];

  for (const instrument of instruments) {
    await prisma.instrument.upsert({
      where: { code: instrument.code },
      update: {},
      create: instrument,
    });
  }

  console.log("✅ Seeded instruments:", instruments.map(i => i.code));

  // --- Test Users (DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION!) ---
  // WARNING: These test users should ONLY be created in local development
  // For production, create real users through the application
  const hashedPassword = await bcrypt.hash("password123", 12);

  const testUsers = [
    {
      email: "admin@test.com",
      name: "Admin User (DEV ONLY)",
      password: hashedPassword,
      roles: [Role.admin],
      isActive: true,
    },
    {
      email: "leader@test.com",
      name: "Leader User (DEV ONLY)",
      password: hashedPassword,
      roles: [Role.leader],
      isActive: true,
    },
    {
      email: "musician@test.com",
      name: "Musician User (DEV ONLY)",
      password: hashedPassword,
      roles: [Role.musician],
      isActive: true,
    },
  ];

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  console.log("✅ Seeded test users:", testUsers.map(u => u.email));

  // --- Songs with Versions ---
  const songsData = [
    {
      title: "Great Is Thy Faithfulness",
      artist: "Thomas Chisholm",
      language: "English",
      familiarityScore: 95,
      versions: [
        { name: "Original Hymn", defaultKey: "G", bpm: 80 }
      ]
    },
    {
      title: "How Great Thou Art",
      artist: "Carl Boberg",
      language: "English",
      familiarityScore: 90,
      versions: [
        { name: "Traditional", defaultKey: "C", bpm: 72 },
        { name: "Contemporary", defaultKey: "D", bpm: 85 }
      ]
    },
    {
      title: "Goodness of God",
      artist: "Jenn Johnson",
      language: "English",
      familiarityScore: 85,
      versions: [
        { name: "Live", defaultKey: "C", bpm: 123 }
      ]
    },
    {
      title: "Way Maker",
      artist: "Sinach",
      language: "English",
      familiarityScore: 80,
      versions: [
        { name: "Live", defaultKey: "D", bpm: 140 },
        { name: "Acoustic", defaultKey: "C", bpm: 120 }
      ]
    },
    {
      title: "Oceans (Where Feet May Fail)",
      artist: "Hillsong UNITED",
      language: "English",
      familiarityScore: 88,
      versions: [
        { name: "Original", defaultKey: "D", bpm: 72 }
      ]
    },
    {
      title: "Reckless Love",
      artist: "Cory Asbury",
      language: "English",
      familiarityScore: 82,
      versions: [
        { name: "Studio", defaultKey: "E", bpm: 138 }
      ]
    }
  ];

  for (const songData of songsData) {
    const { versions, ...songFields } = songData;

    // Find existing song by title and artist
    let song = await prisma.song.findFirst({
      where: {
        title: songFields.title,
        artist: songFields.artist
      }
    });

    // If not found, create it
    if (!song) {
      song = await prisma.song.create({
        data: songFields
      });
    }

    // Create versions for this song
    for (const versionData of versions) {
      // Check if version already exists
      const existingVersion = await prisma.songVersion.findFirst({
        where: {
          songId: song.id,
          name: versionData.name
        }
      });

      if (!existingVersion) {
        await prisma.songVersion.create({
          data: {
            ...versionData,
            songId: song.id
          }
        });
      }
    }
  }

  console.log("✅ Seeded songs with versions:", songsData.map(s => s.title));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
