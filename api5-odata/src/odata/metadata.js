/**
 * OData $metadata document generator.
 * Returns an OData 4.0 CSDL (Common Schema Definition Language) XML document.
 */

function generateMetadata(baseUrl) {
  return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.xml">
    <edmx:Include Alias="Capabilities" Namespace="Org.OData.Capabilities.V1"/>
  </edmx:Reference>
  <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml">
    <edmx:Include Alias="Core" Namespace="Org.OData.Core.V1"/>
  </edmx:Reference>
  <edmx:DataServices>
    <Schema Namespace="ProductCatalog" xmlns="http://docs.oasis-open.org/odata/ns/edm">

      <!-- ── Entity Types ─────────────────────────────────────────────────── -->

      <EntityType Name="Category">
        <Key>
          <PropertyRef Name="id"/>
        </Key>
        <Property Name="id"          Type="Edm.Int32"  Nullable="false"/>
        <Property Name="name"        Type="Edm.String" Nullable="false" MaxLength="100"/>
        <Property Name="description" Type="Edm.String"/>
        <NavigationProperty Name="Products" Type="Collection(ProductCatalog.Product)" Partner="Category"/>
      </EntityType>

      <EntityType Name="Product">
        <Key>
          <PropertyRef Name="id"/>
        </Key>
        <Property Name="id"           Type="Edm.Int32"    Nullable="false"/>
        <Property Name="name"         Type="Edm.String"   Nullable="false" MaxLength="200"/>
        <Property Name="description"  Type="Edm.String"/>
        <Property Name="price"        Type="Edm.Decimal"  Nullable="false" Scale="2"/>
        <Property Name="stock"        Type="Edm.Int32"    Nullable="false"/>
        <Property Name="rating"       Type="Edm.Decimal"  Scale="1"/>
        <Property Name="categoryId"   Type="Edm.Int32"    Nullable="false"/>
        <Property Name="createdAt"    Type="Edm.DateTimeOffset"/>
        <Property Name="discontinued" Type="Edm.Boolean"  Nullable="false"/>
        <NavigationProperty Name="Category" Type="ProductCatalog.Category" Partner="Products">
          <ReferentialConstraint Property="categoryId" ReferencedProperty="id"/>
        </NavigationProperty>
      </EntityType>

      <!-- ── Entity Container ─────────────────────────────────────────────── -->

      <EntityContainer Name="DefaultContainer">
        <EntitySet Name="Products" EntityType="ProductCatalog.Product">
          <NavigationPropertyBinding Path="Category" Target="Categories"/>
          <Annotation Term="Capabilities.FilterRestrictions">
            <Record>
              <PropertyValue Property="Filterable" Bool="true"/>
            </Record>
          </Annotation>
          <Annotation Term="Capabilities.SortRestrictions">
            <Record>
              <PropertyValue Property="Sortable" Bool="true"/>
            </Record>
          </Annotation>
        </EntitySet>
        <EntitySet Name="Categories" EntityType="ProductCatalog.Category">
          <NavigationPropertyBinding Path="Products" Target="Products"/>
        </EntitySet>
      </EntityContainer>

    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

/**
 * OData service document — lists entity sets available at the service root.
 */
function generateServiceDocument(baseUrl) {
  return {
    "@odata.context": `${baseUrl}/$metadata`,
    value: [
      { name: "Products",   kind: "EntitySet", url: "Products"   },
      { name: "Categories", kind: "EntitySet", url: "Categories" },
    ],
  };
}

module.exports = { generateMetadata, generateServiceDocument };
