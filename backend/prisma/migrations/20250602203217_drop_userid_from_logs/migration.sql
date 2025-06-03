-- CreateTable
CREATE TABLE "InteractionLog" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "skipped" BOOLEAN NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "InteractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionStat" (
    "id" SERIAL NOT NULL,
    "appear" INTEGER NOT NULL,
    "correct_pct" DOUBLE PRECISION NOT NULL,
    "wrong_pct" DOUBLE PRECISION NOT NULL,
    "skip_count" INTEGER NOT NULL,
    "avg_time_ms" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "SessionStat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InteractionLog" ADD CONSTRAINT "InteractionLog_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
