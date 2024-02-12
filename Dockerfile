FROM maven:3.5.2-jdk-8-alpine AS MAVEN_BUILD

COPY pom.xml /build/
# COPY database.db /build/
COPY synner-core /build/synner-core
COPY synner-server /build/synner-server

WORKDIR /build/
RUN mvn clean install package

RUN echo $(ls -1 /build/synner-server/target)

FROM openjdk:8-jre-alpine

WORKDIR /app

COPY --from=MAVEN_BUILD /build/synner-server/target/synner-server-0.0.1-SNAPSHOT.jar /app/

ENTRYPOINT ["java", "-jar", "synner-server-0.0.1-SNAPSHOT.jar"]
