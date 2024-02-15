FROM maven:3.9.6-eclipse-temurin-21 AS MAVEN_BUILD
COPY pom.xml /build/
COPY synner-core /build/synner-core
COPY synner-server /build/synner-server
WORKDIR /build/
RUN mvn clean package

FROM eclipse-temurin:21
COPY --from=MAVEN_BUILD /build/synner-server/target/synner-server-0.0.1-SNAPSHOT.jar /app/
COPY --from=MAVEN_BUILD /build/synner-server/target/lib /app/lib/
WORKDIR /app
ENTRYPOINT ["java", "-jar", "synner-server-0.0.1-SNAPSHOT.jar"]