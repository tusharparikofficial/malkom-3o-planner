-- CreateTable
CREATE TABLE "LibraryDiagram" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "diagramType" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryDiagram_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LibraryDiagram" ADD CONSTRAINT "LibraryDiagram_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
