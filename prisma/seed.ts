import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('👥 Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const students = await Promise.all([
    prisma.user.create({
      data: {
        email: 'student1@example.com',
        password: passwordHash,
        name: 'John Student',
        role: 'student',
        emailVerified: true,
        verification: 'verified',
        bio: 'Looking for a room near campus',
        phone: '+1-555-0101',
      },
    }),
    prisma.user.create({
      data: {
        email: 'student2@example.com',
        password: passwordHash,
        name: 'Sarah Student',
        role: 'student',
        emailVerified: true,
        verification: 'verified',
        bio: 'Graduate student seeking quiet room',
        phone: '+1-555-0102',
      },
    }),
    prisma.user.create({
      data: {
        email: 'student3@example.com',
        password: passwordHash,
        name: 'Mike Student',
        role: 'student',
        emailVerified: true,
        verification: 'verified',
      },
    }),
  ]);

  const landlords = await Promise.all([
    prisma.user.create({
      data: {
        email: 'landlord1@example.com',
        password: passwordHash,
        name: 'Jane Landlord',
        role: 'landlord',
        emailVerified: true,
        verification: 'verified',
        bio: 'Experienced landlord with multiple properties',
        phone: '+1-555-0201',
      },
    }),
    prisma.user.create({
      data: {
        email: 'landlord2@example.com',
        password: passwordHash,
        name: 'Bob Landlord',
        role: 'landlord',
        emailVerified: true,
        verification: 'verified',
        bio: 'Property manager specializing in student housing',
        phone: '+1-555-0202',
      },
    }),
  ]);

  console.log(`✅ Created ${students.length} students and ${landlords.length} landlords`);

  // Create listings
  console.log('🏠 Creating listings...');
  const listings = await Promise.all([
    prisma.listing.create({
      data: {
        title: 'Cozy Room Near University',
        description: 'Beautiful single room in a shared house, perfect for students. Close to campus, public transport, and shopping centers. Quiet neighborhood with friendly housemates.',
        price: 650,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 150,
        city: 'Boston',
        state: 'Massachusetts',
        zip: '02115',
        address: '123 University Ave',
        latitude: 42.3398,
        longitude: -71.0892,
        amenities: ['WiFi', 'Parking', 'Laundry', 'Furnished', 'Air Conditioning'],
        images: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        ],
        status: 'available',
        availabilityDate: new Date('2025-01-15'),
        landlordId: landlords[0].id,
      },
    }),
    prisma.listing.create({
      data: {
        title: 'Modern Studio Apartment',
        description: 'Spacious studio apartment in downtown area. Fully furnished with modern amenities. Perfect for young professionals or graduate students.',
        price: 1200,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 400,
        city: 'New York',
        state: 'New York',
        zip: '10001',
        address: '456 Main Street',
        latitude: 40.7128,
        longitude: -74.0060,
        amenities: ['WiFi', 'Parking', 'Laundry', 'Furnished', 'Gym Access', 'Pool'],
        images: [
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
        ],
        status: 'available',
        availabilityDate: new Date('2025-02-01'),
        landlordId: landlords[1].id,
      },
    }),
    prisma.listing.create({
      data: {
        title: 'Shared Room in Student House',
        description: 'Affordable room in a student house. Great location, close to campus. Shared kitchen and living area. Utilities included.',
        price: 450,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 120,
        city: 'Los Angeles',
        state: 'California',
        zip: '90001',
        address: '789 Student Blvd',
        latitude: 34.0522,
        longitude: -118.2437,
        amenities: ['WiFi', 'Laundry', 'Furnished'],
        images: [
          'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800',
        ],
        status: 'available',
        availabilityDate: new Date('2025-01-20'),
        landlordId: landlords[0].id,
      },
    }),
    prisma.listing.create({
      data: {
        title: 'Private Room with Bathroom',
        description: 'Private room with ensuite bathroom. Quiet neighborhood, perfect for studying. Pet-friendly building.',
        price: 850,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 180,
        city: 'Chicago',
        state: 'Illinois',
        zip: '60601',
        address: '321 Lake Street',
        latitude: 41.8781,
        longitude: -87.6298,
        amenities: ['WiFi', 'Parking', 'Laundry', 'Furnished', 'Pet Friendly', 'Air Conditioning'],
        images: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        ],
        status: 'available',
        availabilityDate: new Date('2025-01-25'),
        landlordId: landlords[1].id,
      },
    }),
    prisma.listing.create({
      data: {
        title: 'Furnished Room Near Campus',
        description: 'Fully furnished room in a clean, modern house. All utilities included. Great for students who want a hassle-free living situation.',
        price: 700,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 160,
        city: 'Boston',
        state: 'Massachusetts',
        zip: '02115',
        address: '555 College Road',
        latitude: 42.3505,
        longitude: -71.1054,
        amenities: ['WiFi', 'Parking', 'Laundry', 'Furnished', 'Heating'],
        images: [
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
        ],
        status: 'available',
        availabilityDate: new Date('2025-02-10'),
        landlordId: landlords[0].id,
      },
    }),
  ]);

  console.log(`✅ Created ${listings.length} listings`);

  // Create favorites
  console.log('❤️ Creating favorites...');
  await Promise.all([
    prisma.favorite.create({
      data: {
        userId: students[0].id,
        listingId: listings[0].id,
      },
    }),
    prisma.favorite.create({
      data: {
        userId: students[0].id,
        listingId: listings[1].id,
      },
    }),
    prisma.favorite.create({
      data: {
        userId: students[1].id,
        listingId: listings[2].id,
      },
    }),
  ]);

  console.log('✅ Created favorites');

  // Create reviews
  console.log('⭐ Creating reviews...');
  await Promise.all([
    prisma.review.create({
      data: {
        reviewerId: students[0].id,
        revieweeId: landlords[0].id,
        listingId: listings[0].id,
        rating: 5,
        comment: 'Great landlord! Very responsive and the room was exactly as described. Highly recommend!',
      },
    }),
    prisma.review.create({
      data: {
        reviewerId: students[1].id,
        revieweeId: landlords[1].id,
        listingId: listings[1].id,
        rating: 4,
        comment: 'Nice place, good location. Landlord is professional and helpful.',
      },
    }),
  ]);

  console.log('✅ Created reviews');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('Student: student1@example.com / password123');
  console.log('Landlord: landlord1@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






