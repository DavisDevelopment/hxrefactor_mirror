"use strict";
const ts = require("typescript");
class TypeConvertor {
    constructor(parser, typeMapper, knownTypes) {
        this.parser = parser;
        this.typeMapper = typeMapper;
        this.knownTypes = knownTypes;
    }
    /**
     * localePath:
     *  `mypack.MyClas<T` - type of class <TypeParameter>
     *  `mypack.MyClas@myFunc` - return type of the function or variable
     *  `mypack.MyClas@myFunc.a` - type of the parameter "a"
     */
    convert(node, localePath) {
        var r = this.convertInner(node, localePath);
        if (this.isNothingType(r))
            return "{}";
        return r;
    }
    convertInner(node, localePath) {
        if (!node)
            return "Dynamic";
        switch (node.kind) {
            case ts.SyntaxKind.FunctionType:
                {
                    let t = node;
                    let types = [];
                    if (t.parameters.length > 0)
                        for (var p of t.parameters)
                            types.push(this.convert(p.type, p.name.getText()));
                    else
                        types.push("Void");
                    types.push(this.convert(t.type, null));
                    return this.mapType(types.join("->"), localePath);
                }
            case ts.SyntaxKind.ArrayType:
                {
                    let t = node;
                    let subType = t.elementType;
                    if (subType.kind == ts.SyntaxKind.ParenthesizedType)
                        subType = subType.type;
                    return this.mapType("Array<" + this.convert(subType, null) + ">", localePath);
                }
            case ts.SyntaxKind.UnionType:
                {
                    return this.mapType(this.convertUnionType(node.types, localePath), localePath);
                }
            case ts.SyntaxKind.TypeLiteral:
                {
                    return this.processTypeLiteral(node);
                }
            case ts.SyntaxKind.TypeReference:
                {
                    let t = node;
                    if (t.typeArguments == null || t.typeArguments.length == 0) {
                        return this.mapType(t.typeName.getText(), localePath);
                    }
                    else {
                        var s = this.mapType(t.typeName.getText(), null);
                        var pp = t.typeArguments.map(x => this.convert(x, null));
                        return this.mapType(s + "<" + pp.join(", ") + ">", localePath);
                    }
                }
            case ts.SyntaxKind.ParenthesizedType:
                {
                    let t = node;
                    if (t.getChildCount() == 3 && t.getChildAt(0).kind == ts.SyntaxKind.OpenParenToken && t.getChildAt(2).kind == ts.SyntaxKind.CloseParenToken) {
                        return "(" + this.convert(t.getChildAt(1), localePath) + ")";
                    }
                }
            case ts.SyntaxKind.ThisType:
                {
                    return localePath.split("@")[0].split(".").pop();
                }
        }
        return this.mapType(node.getText(), localePath);
    }
    mapType(type, localePath) {
        return this.typeMapper.map(type, localePath, this.knownTypes, this.parser.curPackage);
    }
    convertUnionType(types, localePath) {
        //var hasNull = types.findIndex(x => this.isNull(x));
        //if (hasNull) types = types.filter(x => !this.isNull(x));
        types = types.filter(x => !this.isNull(x));
        var r;
        if (types.length == 1) {
            r = this.convert(types[0], null);
        }
        else {
            var stringLiterals = types.filter(x => this.isStringLiteralType(x));
            if (stringLiterals.length > 0) {
                var otherTypes = types.filter(x => !this.isStringLiteralType(x));
                var newEnum = this.parser.addNewEnumAsStringAbstract(localePath, stringLiterals.map(x => x.getChildAt(0).text));
                var mappedEnum = this.mapType(newEnum.fullClassName, null);
                r = otherTypes.length > 0 ? this.convertUnionTypeInner(mappedEnum, this.convertUnionType(otherTypes, null)) : mappedEnum;
            }
            else {
                r = this.convertUnionTypeInner(this.convert(types[0], null), this.convertUnionType(types.slice(1), null));
            }
        }
        //return hasNull ? "Null<" + r + ">" : r;
        return r;
    }
    convertUnionTypeInner(typeA, typeB) {
        if (this.isNothingType(typeA))
            return typeB;
        if (this.isNothingType(typeB))
            return typeA;
        return "haxe.extern.EitherType<" + typeA + ", " + typeB + ">";
    }
    processTypeLiteral(node) {
        if (node.members.length == 1 && node.members[0].kind == ts.SyntaxKind.IndexSignature) {
            let tt = node.members[0];
            if (tt.parameters.length == 1)
                return "Dynamic<" + this.convert(tt.type, null) + ">";
        }
        return this.parser.parseLiteralType(node);
    }
    prepareTypeParameters(node) {
        if (!node.typeParameters)
            return [];
        return node.typeParameters.map(t => ({ name: t.name.getText(), constraint: this.convert(t.constraint, null) }));
    }
    isStringLiteralType(x) {
        return x.kind == ts.SyntaxKind.LastTypeNode && x.getChildCount() == 1 && x.getChildAt(0).kind == ts.SyntaxKind.StringLiteral;
    }
    isNull(x) {
        return x.kind == ts.SyntaxKind.NullKeyword;
    }
    isNothingType(type) {
        return ["null", "undefined"].indexOf(type) >= 0;
    }
}
exports.TypeConvertor = TypeConvertor;
//# sourceMappingURL=TypeConvertor.js.map