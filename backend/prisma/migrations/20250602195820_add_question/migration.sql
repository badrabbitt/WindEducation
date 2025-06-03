-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "content" JSONB NOT NULL,
    "subject" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aiCheck" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
