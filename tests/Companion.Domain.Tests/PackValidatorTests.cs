using Companion.Domain.Validation;
using Companion.Domain.Tests.Builders;
using Shouldly;

namespace Companion.Domain.Tests;

public class PackValidatorTests
{
    [Fact]
    public void ValidPack_HasNoErrors()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(1, 3))
            .WithItem("b", i => i.Window(2, null).Needs("a").Routed(at: 2))
            .Build();

        PackValidator.Validate(pack).ShouldBeEmpty();
        Should.NotThrow(() => PackValidator.ValidateOrThrow(pack));
    }

    [Fact]
    public void UnknownPrereqId_IsReported()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(1, null).Needs("ghost"))
            .Build();

        PackValidator.Validate(pack).ShouldHaveSingleItem().ShouldContain("unknown prereq 'ghost'");
    }

    [Fact]
    public void DirectPrereqCycle_IsReported()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(1, null).Needs("b"))
            .WithItem("b", i => i.Window(1, null).Needs("a"))
            .Build();

        PackValidator.Validate(pack).ShouldHaveSingleItem().ShouldContain("prereq cycle");
    }

    [Fact]
    public void TransitivePrereqCycle_IsReported()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(1, null).Needs("c"))
            .WithItem("b", i => i.Window(1, null).Needs("a"))
            .WithItem("c", i => i.Window(1, null).Needs("b"))
            .Build();

        PackValidator.Validate(pack).ShouldHaveSingleItem().ShouldContain("prereq cycle");
    }

    [Fact]
    public void OpensAtReferencingMissingOrder_IsReported()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(9, null))
            .Build();

        PackValidator.Validate(pack).ShouldHaveSingleItem().ShouldContain("opensAt 9");
    }

    [Fact]
    public void ClosesAtReferencingMissingOrder_IsReported()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(1, 9))
            .Build();

        PackValidator.Validate(pack).ShouldHaveSingleItem().ShouldContain("closesAt 9");
    }

    [Fact]
    public void RouteAtReferencingMissingOrder_IsReported()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(1, null).Routed(at: 9))
            .Build();

        PackValidator.Validate(pack).ShouldHaveSingleItem().ShouldContain("route.at 9");
    }

    [Fact]
    public void ClosesBeforeOpens_IsReported()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(4, 2))
            .Build();

        PackValidator.Validate(pack).ShouldHaveSingleItem().ShouldContain("closesAt 2 is before opensAt 4");
    }

    [Fact]
    public void DuplicateItemIds_AreReported()
    {
        var pack = new PackBuilder()
            .WithPositions(5)
            .WithItem("a", i => i.Window(1, null))
            .WithItem("a", i => i.Window(2, null))
            .Build();

        PackValidator.Validate(pack).ShouldHaveSingleItem().ShouldContain("duplicate item id 'a'");
    }

    [Fact]
    public void DuplicatePositionOrders_AreReported()
    {
        var pack = new PackBuilder()
            .WithPositions(3)
            .WithPosition("extra", 2)
            .Build();

        PackValidator.Validate(pack).ShouldContain(e => e.Contains("duplicate position order 2"));
    }

    [Fact]
    public void AllErrorsAreCollected_NotJustTheFirst()
    {
        var pack = new PackBuilder()
            .WithPositions(3)
            .WithItem("a", i => i.Window(9, null).Needs("ghost"))
            .Build();

        var errors = PackValidator.Validate(pack);

        errors.Count.ShouldBe(2);
    }

    [Fact]
    public void ValidateOrThrow_ListsEveryErrorInTheMessage()
    {
        var pack = new PackBuilder()
            .ForGame("ff7")
            .WithPositions(3)
            .WithItem("a", i => i.Window(9, null).Needs("ghost"))
            .Build();

        var ex = Should.Throw<PackValidationException>(() => PackValidator.ValidateOrThrow(pack));

        ex.PackId.ShouldBe("ff7");
        ex.Errors.Count.ShouldBe(2);
        ex.Message.ShouldContain("unknown prereq");
        ex.Message.ShouldContain("opensAt 9");
    }
}
